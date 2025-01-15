import { exec, spawn } from "child_process";
import { app } from "electron";
import path from "path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { isAppleSilicon, isWin32 } from "./utils";
import { BrowserWindow, DownloadItem } from 'electron';
import decompress from 'decompress';
import fs from 'fs-extra';

export const getPath = (key?: string) => {
  const userDataPath = app.getPath("userData");
  const whisperPath = path.join(userDataPath, "whisper.cpp");
  const mainPath = path.join(userDataPath, "whisper.cpp/main");
  const modelsPath = path.join(userDataPath, "whisper.cpp/models");
  const res = {
    userDataPath,
    whisperPath,
    mainPath,
    modelsPath,
  };
  if (key) return res[key];
  return res;
};

export const getModelsInstalled = () => {
  const modelsPath = getPath("modelsPath");
  try {
    const models = fs
      .readdirSync(modelsPath)
      ?.filter((file) => file.startsWith("ggml-") && file.endsWith(".bin"));
    return models.map((model) =>
      model.replace("ggml-", "").replace(".bin", ""),
    );
  } catch (e) {
    return [];
  }
};

export const checkWhisperInstalled = () => {
  const whisperPath = getPath("modelsPath");
  return fs.existsSync(whisperPath);
};

const whisperRepos = {
  github: "https://github.com/ggerganov/whisper.cpp",
  gitee: "https://gitee.com/mirrors/whisper.cpp.git",
};

export const install = (event, source) => {
  const repoUrl = whisperRepos[source] || whisperRepos.github;
  const whisperPath = getPath("whisperPath");
  if (checkWhisperInstalled()) {
    event.sender.send("installWhisperComplete", true);
    return;
  }
  git
    .clone({
      fs,
      http,
      dir: whisperPath,
      url: repoUrl,
      singleBranch: true,
      depth: 1,
      ref: 'v1.7.2',
      onProgress: (res) => {
        if (res.total) {
          event.sender.send("installWhisperProgress", res.phase, res.loaded / res.total);
        }
      },
    })
    .then((res) => {
      if (checkWhisperInstalled()) {
        console.log(`仓库已经被克隆到: ${whisperPath}`);
        event.sender.send("installWhisperComplete", true);
      } else {
        install(event, source);
      }
    })
    .catch((err) => {
      console.error(`克隆仓库时出错: ${err}`);
      exec(`rm -rf "${whisperPath}"`, (err, stdout) => {
        console.log(err);
      });
      event.sender.send("message", err);
      event.sender.send("installWhisperComplete", false);
    });
};

export const makeWhisper = (event) => {
  const { whisperPath, mainPath } = getPath();
  if (fs.existsSync(mainPath) || isWin32()) {
    event.sender.send("makeWhisperComplete", true);
    return;
  }
  if (!checkWhisperInstalled()) {
    event.sender.send("message", "whisper.cpp 未下载，请先下载 whisper.cpp");
  }
  event.sender.send("beginMakeWhisper", true);
  
  // 修改编译命令以支持 GPU
  const makeCommand = isAppleSilicon() 
    ? `WHISPER_COREML=1 make -j -C "${whisperPath}"`  // Apple Silicon 继续使用 CoreML
    : `WHISPER_CUBLAS=1 make -j -C "${whisperPath}"`; // 其他平台启用 CUDA 支持

  exec(makeCommand, (err, stdout) => {
    if (err) {
      // 如果 CUDA 编译失败，尝试回退到 CPU 版本
      if (err.message?.includes('cublas')) {
        console.log('CUDA 编译失败，回退到 CPU 版本');
        const cpuCommand = `make -j -C "${whisperPath}"`;
        exec(cpuCommand, (cpuErr, cpuStdout) => {
          if (cpuErr) {
            event.sender.send("message", cpuErr);
            event.sender.send("makeWhisperComplete", false);
          } else {
            event.sender.send("getSystemComplete", {
              whisperInstalled: checkWhisperInstalled(),
              modelsInstalled: getModelsInstalled(),
            });
            event.sender.send("message", "编译完成 (CPU 版本)");
            event.sender.send("makeWhisperComplete", true);
          }
        });
      } else {
        event.sender.send("message", err);
        event.sender.send("makeWhisperComplete", false);
      }
    } else {
      event.sender.send("getSystemComplete", {
        whisperInstalled: checkWhisperInstalled(),
        modelsInstalled: getModelsInstalled(),
      });
      event.sender.send("message", "编译完成 (GPU 加速版本)");
      event.sender.send("makeWhisperComplete", !err);
    }
  });
};

export const deleteModel = async (model) => {
  const modelsPath = getPath("modelsPath");
  const modelPath = path.join(modelsPath, `ggml-${model}.bin`);
  const coreMLModelPath = path.join(modelsPath, `ggml-${model}-encoder.mlmodelc`);
  
  return new Promise((resolve, reject) => {
    try {
      if (fs.existsSync(modelPath)) {
        fs.unlinkSync(modelPath);
      }
      if (fs.existsSync(coreMLModelPath)) {
        fs.removeSync(coreMLModelPath); // 递归删除目录
      }
      resolve("ok");
    } catch (error) {
      console.error('删除模型失败:', error);
      reject(error);
    }
  });
};

export const downloadModelSync = async (model: string, source: string, onProcess: (message: string) => void) => {
  const modelsPath = getPath("modelsPath");
  const modelPath = path.join(modelsPath, `ggml-${model}.bin`);
  const coreMLModelPath = path.join(modelsPath, `ggml-${model}-encoder.mlmodelc`);
  
  if (fs.existsSync(modelPath) && (!isAppleSilicon() || fs.existsSync(coreMLModelPath))) {
    return;
  }
  if (!checkWhisperInstalled()) {
    throw Error("whisper.cpp 未安装，请先安装 whisper.cpp");
  }

  const baseUrl = `https://${source === 'huggingface' ? 'huggingface.co' : 'hf-mirror.com'}/ggerganov/whisper.cpp/resolve/main`;
  const url = `${baseUrl}/ggml-${model}.bin`;
  const coreMLUrl = `${baseUrl}/ggml-${model}-encoder.mlmodelc.zip`;
  
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({ show: false });
    let downloadCount = 0;
    const totalDownloads = isAppleSilicon() ? 2 : 1;
    let totalBytes = { normal: 0, coreML: 0 };
    let receivedBytes = { normal: 0, coreML: 0 };
    
    const willDownloadHandler = (event, item: DownloadItem) => {
      const isCoreML = item.getFilename().includes('-encoder.mlmodelc');
      
      // 检查是否为当前模型的下载项
      if (!item.getFilename().includes(`ggml-${model}`)) {
        return; // 忽略不匹配的下载项
      }

      if (isCoreML && !isAppleSilicon()) {
        item.cancel();
        return;
      }
      const savePath = isCoreML ? path.join(modelsPath, `ggml-${model}-encoder.mlmodelc.zip`) : modelPath;
      item.setSavePath(savePath);

      const type = isCoreML ? 'coreML' : 'normal';
      totalBytes[type] = item.getTotalBytes();

      item.on('updated', (event, state) => {
        if (state === 'progressing' && !item.isPaused()) {
          receivedBytes[type] = item.getReceivedBytes();
          const totalProgress = (receivedBytes.normal + receivedBytes.coreML) / (totalBytes.normal + totalBytes.coreML);
          const percent = totalProgress * 100;
          onProcess(`${model}: ${percent.toFixed(2)}%`);
        }
      });

      item.once('done', async (event, state) => {
        if (state === 'completed') {
          downloadCount++;
          
          if (isCoreML) {
            try {
              const zipPath = path.join(modelsPath, `ggml-${model}-encoder.mlmodelc.zip`);
              await decompress(zipPath, modelsPath);
              fs.unlinkSync(zipPath); // 删除zip文件
              onProcess(`Core ML ${model} 解压完成`);
            } catch (error) {
              console.error('解压Core ML模型失败:', error);
              reject(new Error(`解压Core ML模型失败: ${error.message}`));
            }
          }
          
          if (downloadCount === totalDownloads) {
            onProcess(`${model} 下载完成`);
            cleanup();
            resolve(1);
          }
        } else {
          cleanup();
          reject(new Error(`${model} download error: ${state}`));
        }
      });
    };

    const cleanup = () => {
      win.webContents.session.removeListener('will-download', willDownloadHandler);
      win.destroy();
    };

    win.webContents.session.on('will-download', willDownloadHandler);
    win.webContents.downloadURL(url);
    if (isAppleSilicon()) {
      win.webContents.downloadURL(coreMLUrl);
    }
  });
};

export async function checkOpenAiWhisper(): Promise<boolean> {
  return new Promise((resolve) => {
    const command = isWin32() ? "whisper.exe" : "whisper";
    const env = { ...process.env, PYTHONIOENCODING: "UTF-8" };
    const childProcess = spawn(command, ["-h"], { env, shell: true });
    
    const timeout = setTimeout(() => {
      childProcess.kill();
      resolve(false);
    }, 5000);

    childProcess.on("error", (error) => {
      clearTimeout(timeout);
      console.log("spawn error: ", error);
      resolve(false);
    });

    childProcess.on("exit", (code) => {
      clearTimeout(timeout);
      console.log("exit code: ", code);
      resolve(code === 0);
    });
  });
}

export const reinstallWhisper = async () => {
  const whisperPath = getPath("whisperPath");
  
  // 删除现有的 whisper.cpp 目录
  try {
    await fs.remove(whisperPath);
    return true;
  } catch (error) {
    console.error('删除 whisper.cpp 目录失败:', error);
    throw new Error('删除 whisper.cpp 目录失败');
  }
};