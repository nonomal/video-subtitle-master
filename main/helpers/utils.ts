import path from "path";
import { app } from "electron";
import os from "os";
import { spawn } from "child_process";

// 将字符串转成模板字符串
export const renderTemplate = (template, data) => {
  const names = Object.keys(data);
  const values = Object.values(data);
  return new Function(...names, `return \`${template}\`;`)(...values);
};

export const isDarwin = () => os.platform() === "darwin";

export const isWin32 = () => os.platform() === "win32";

export const isAppleSilicon = () => {
  return os.platform() === 'darwin' && os.arch() === 'arm64';
};

export const getExtraResourcesPath = () => {
  const isProd = process.env.NODE_ENV === "production";
  return isProd
    ? path.join(process.resourcesPath, "extraResources")
    : path.join(app.getAppPath(), "extraResources");
};

export function runCommand(command, args, onProcess = undefined) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    const sendProgress = throttle((data) => {
      onProcess && onProcess(data?.toString());
    }, 300);
    child.stdout.on("data", (data) => {
      // console.log(`${data} \n`);
      sendProgress(data);
    });

    child.stderr.on("data", (data) => {
      // console.error(`${data} \n`);
      sendProgress(data);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`${command} ${args.join(" ")} process error ${code}`),
        );
      } else {
        resolve(true);
      }
    });
  });
}

function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function (...args) {
    const context = this;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(
        function () {
          if (Date.now() - lastRan >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan),
      );
    }
  };
}

// 删除 processFile 函数

export const defaultUserConfig = {
    sourceLanguage: 'en',
    targetLanguage: 'zh',
    customTargetSrtFileName: '${fileName}.${targetLanguage}',
    customSourceSrtFileName: '${fileName}.${sourceLanguage}',
    model: 'tiny',
    translateProvider: 'baidu',
    translateContent: 'onlyTranslate',
    maxConcurrentTasks: 1,
    sourceSrtSaveOption: 'noSave',
    targetSrtSaveOption: 'fileNameWithLang',
}

export function getSrtFileName(
  option: string,
  fileName: string,
  language: string,
  customFileName: string,
  templateData: { [key: string]: string }
): string {
  switch (option) {
    case 'noSave':
      return `${fileName}_temp`;
    case 'fileName':
      return fileName;
    case 'fileNameWithLang':
      return `${fileName}.${language}`;
    case 'custom':
      return renderTemplate(customFileName, templateData);
    default:
      return `${fileName}_temp`;
  }
}