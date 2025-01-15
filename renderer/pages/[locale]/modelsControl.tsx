import React, { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { models, getModelDownloadUrl } from 'lib/utils';
import { Button } from '@/components/ui/button';
import { ISystemInfo } from '../../types';
import DeleteModel from '@/components/DeleteModel';
import DownModel from '@/components/DownModel';
import DownModelButton from '@/components/DownModelButton';
import { Upload } from 'lucide-react'; // 导入上传图标
import { Copy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import { getStaticPaths, makeStaticProperties } from '../../lib/get-static'
const ModelsControl = () => {
  const { t } = useTranslation('modelsControl');
  const { t: tCommon } = useTranslation('common');
  const [systemInfo, setSystemInfo] = React.useState<ISystemInfo>({
    whisperInstalled: true,
    modelsInstalled: [],
    downloadingModels: [],
  });
  const [downSource, setDownSource] = useState('hf-mirror');
  useEffect(() => {
    updateSystemInfo();
  }, []);
  const updateSystemInfo = async () => {
    const systemInfoRes = await window?.ipc?.invoke('getSystemInfo', null);
    setSystemInfo(systemInfoRes);
  };
  const isInstalledModel = (name) =>
    systemInfo?.modelsInstalled?.includes(name.toLowerCase());
  const handleDownSource = (value: string) => {
    setDownSource(value);
  };
  const handleImportModel = async () => {
    try {
      const result = await window?.ipc?.invoke('importModel');
      if (result) {
        updateSystemInfo();
      }
    } catch (error) {
      console.error('导入模型失败:', error);
      // 这里可以添加一个错误提示
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t('copySuccess'), {
        duration: 2000,
      });
    }).catch((err) => {
      toast.error(t('copyError'), {
        duration: 2000,
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('modelManagement')}</CardTitle>
        <CardDescription>
          {t('modelManagementDesc')} <br />
          {t('modelPath')}:
          <br />
          {systemInfo?.modelsPath}
          <span className="float-right mt-4 flex items-center">
            <span>{t('switchDownloadSource')}:</span>
            <Select onValueChange={handleDownSource} value={downSource}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={t('switchDownloadSource')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hf-mirror">{t('domesticMirror')}</SelectItem>
                <SelectItem value="huggingface">
                  {t('officialSource')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleImportModel} className="ml-4">
              <Upload className="mr-2 h-4 w-4" /> {t('importModel')}
            </Button>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">{t('modelName')}</TableHead>
              <TableHead>{t('description')}</TableHead>
              <TableHead>{t('operation')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="max-h-[80vh]">
            {models.map((model) => (
              <TableRow key={model?.name}>
                <TableCell className="font-medium">{model?.name}</TableCell>
                <TableCell>
                  {tCommon(model.desc.key)} {model.desc.size}
                  <br />
                  {t('manualDownloadAddress')}:<br />
                  {['hf-mirror', 'huggingface'].map((source) => (
                    <div key={source} className="flex items-center mb-1">
                      <span className="mr-2 text-sm">
                        {getModelDownloadUrl(model.name, source as 'hf-mirror' | 'huggingface')}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Copy 
                              className="h-4 w-4 cursor-pointer" 
                              onClick={() => copyToClipboard(getModelDownloadUrl(model.name, source as 'hf-mirror' | 'huggingface'))}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('copyLink')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  {isInstalledModel(model.name) &&
                  !systemInfo?.downloadingModels.includes(model.name) ? (
                    <DeleteModel
                      modelName={model.name}
                      callBack={updateSystemInfo}
                    >
                      <Button variant="destructive">{t('delete')}</Button>
                    </DeleteModel>
                  ) : (
                    <DownModel
                      modelName={model.name}
                      callBack={updateSystemInfo}
                      downSource={downSource}
                    >
                      <DownModelButton />
                    </DownModel>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ModelsControl;

export const getStaticProps = makeStaticProperties(['common', 'modelsControl'])

export { getStaticPaths }