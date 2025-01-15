import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { getStaticPaths, makeStaticProperties } from '../../lib/get-static'
// 定义统一的服务提供商类型
type Provider = {
  id: string;
  name: string;
  type: 'api' | 'local' | 'openai';
  apiKey?: string;
  apiSecret?: string;
  apiUrl?: string;
  modelName?: string;
  prompt?: string;
};



const TranslateControl: React.FC = () => {
  const { t } = useTranslation('translateControl');
  const { t: tCommon } = useTranslation('common');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [newOpenAIProvider, setNewOpenAIProvider] = useState<Omit<Provider, 'id' | 'type'>>({
    name: '',
    apiUrl: '',
    apiKey: '',
    modelName: '',
    prompt: '',
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    const storedProviders = await window.ipc.invoke('getTranslationProviders');
    setProviders(storedProviders);
  };

  const handleInputChange = async (
    id: string,
    field: keyof Provider,
    value: string
  ) => {
    const updatedProviders = providers.map((provider) =>
      provider.id === id ? { ...provider, [field]: value } : provider
    );
    setProviders(updatedProviders);
    window?.ipc?.send('setTranslationProviders', updatedProviders);
  };

  const togglePasswordVisibility = (id: string, field: 'apiKey' | 'apiSecret') => {
    setShowPassword((prev) => ({
      ...prev,
      [`${id}_${field}`]: !prev[`${id}_${field}`],
    }));
  };

  const apiProviders = providers.filter(p => p.type === 'api');
  const localProviders = providers.filter(p => p.type === 'local');
  const openAIProviders = providers.filter(p => p.type === 'openai');

  const addOpenAIProvider = () => {
    const newProvider: Provider = {
      ...newOpenAIProvider,
      id: newOpenAIProvider.name?.toLowerCase(),
      type: 'openai',
    };
    const updatedProviders = [...providers, newProvider];
    setProviders(updatedProviders);
    window?.ipc?.send('setTranslationProviders', updatedProviders);
    setNewOpenAIProvider({ name: '', apiUrl: '', apiKey: '', modelName: '', prompt: '' });
  };

  const removeOpenAIProvider = (id: string) => {
    const updatedProviders = providers.filter(provider => provider.id !== id);
    setProviders(updatedProviders);
    window?.ipc?.send('setTranslationProviders', updatedProviders);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-lg font-bold mb-4">{t('translateControl')}</h1>
      
      <h2 className="text-base font-bold mb-2">{t('apiServiceProviders')}</h2>
      <Table className="mb-8">
        <TableHeader>
          <TableRow>
            <TableHead>{t('translationServiceProvider')}</TableHead>
            <TableHead>Key/{t('apiAddress')}</TableHead>
            <TableHead>{t('secret')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiProviders.map((provider) => (
            <TableRow key={provider.id}>
              <TableCell>{tCommon(`provider.${provider.id}`)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Input
                    type={showPassword[`${provider.id}_apiKey`] ? 'text' : 'password'}
                    value={provider.apiKey}
                    onChange={(e) => handleInputChange(provider.id, 'apiKey', e.target.value)}
                    className="mr-2"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePasswordVisibility(provider.id, 'apiKey')}
                  >
                    {showPassword[`${provider.id}_apiKey`] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Input
                    type={showPassword[`${provider.id}_apiSecret`] ? 'text' : 'password'}
                    value={provider.apiSecret}
                    onChange={(e) => handleInputChange(provider.id, 'apiSecret', e.target.value)}
                    className="mr-2"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePasswordVisibility(provider.id, 'apiSecret')}
                  >
                    {showPassword[`${provider.id}_apiSecret`] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="text-base font-bold mb-2">{t('localServiceProviders')}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('providerName')}</TableHead>
            <TableHead>{t('apiAddress')}</TableHead>
            <TableHead>{t('modelName')}</TableHead>
            <TableHead>{t('prompt')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {localProviders.map((provider) => (
            <TableRow key={provider.id}>
              <TableCell>{provider.name}</TableCell>
              <TableCell>
                <Input
                  value={provider.apiUrl}
                  onChange={(e) => handleInputChange(provider.id, 'apiUrl', e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={provider.modelName}
                  onChange={(e) => handleInputChange(provider.id, 'modelName', e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Textarea
                  value={provider.prompt}
                  onChange={(e) => handleInputChange(provider.id, 'prompt', e.target.value)}
                  rows={3}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="text-base font-bold mb-2 mt-8">{t('openaiStyleApiServiceConfig')}</h2>
      <Table className="mb-4">
        <TableHeader>
          <TableRow>
            <TableHead>{t('providerName')}</TableHead>
            <TableHead>{t('apiAddress')}</TableHead>
            <TableHead>API Token</TableHead>
            <TableHead>{t('modelName')}</TableHead>
            <TableHead>{t('prompt')}</TableHead>
            <TableHead>{t('operation')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {openAIProviders.map((provider) => (
            <TableRow key={provider.id}>
              <TableCell>{provider.name}</TableCell>
              <TableCell>
                <Input
                  value={provider.apiUrl}
                  onChange={(e) => handleInputChange(provider.id, 'apiUrl', e.target.value)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Input
                    type={showPassword[`${provider.id}_apiKey`] ? 'text' : 'password'}
                    value={provider.apiKey}
                    onChange={(e) => handleInputChange(provider.id, 'apiKey', e.target.value)}
                    className="mr-2"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePasswordVisibility(provider.id, 'apiKey')}
                  >
                    {showPassword[`${provider.id}_apiKey`] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <Input
                  value={provider.modelName}
                  onChange={(e) => handleInputChange(provider.id, 'modelName', e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Textarea
                  value={provider.prompt}
                  onChange={(e) => handleInputChange(provider.id, 'prompt', e.target.value)}
                  rows={2}
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOpenAIProvider(provider.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder={t('providerName')}
          value={newOpenAIProvider.name}
          onChange={(e) => setNewOpenAIProvider(prev => ({ ...prev, name: e.target.value }))}
        />
        <Input
          placeholder={t('apiAddress')}
          value={newOpenAIProvider.apiUrl}
          onChange={(e) => setNewOpenAIProvider(prev => ({ ...prev, apiUrl: e.target.value }))}
        />
        <Input
          placeholder="API token"
          type="password"
          value={newOpenAIProvider.apiKey}
          onChange={(e) => setNewOpenAIProvider(prev => ({ ...prev, apiKey: e.target.value }))}
        />
        <Input
          placeholder={t('modelName')}
          value={newOpenAIProvider.modelName}
          onChange={(e) => setNewOpenAIProvider(prev => ({ ...prev, modelName: e.target.value }))}
        />
        <Input
          placeholder={t('prompt')}
          value={newOpenAIProvider.prompt}
          onChange={(e) => setNewOpenAIProvider(prev => ({ ...prev, prompt: e.target.value }))}
        />
        <Button onClick={addOpenAIProvider}>
          <Plus size={16} className="mr-2" /> {t('add')}
        </Button>
      </div>
    </div>
  );
};

export default TranslateControl;

export const getStaticProps = makeStaticProperties(['common', 'translateControl'])

export { getStaticPaths }