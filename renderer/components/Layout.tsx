import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BotIcon, FileVideo2, Github, MonitorPlay, Languages, Settings } from 'lucide-react';
import { openUrl } from 'lib/utils';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useTranslation } from 'next-i18next';


const Layout = ({ children }) => {
  const { t, i18n: { language: locale } } = useTranslation('common');
  const { asPath } = useRouter();
  useEffect(() => {
    window?.ipc?.on('message', (res: string) => {
      toast(t('notification'), {
        description: t(res),
      });
      console.log(res);
    });
  }, []);

  return (
    <div className="grid h-screen w-full pl-[56px]">
      <aside className="inset-y fixed  left-0 z-20 flex h-full flex-col border-r">
        <div className="border-b p-2">
          <Link href="/home">
            <Button aria-label="Home" size="icon" variant="outline">
              <FileVideo2 className="size-5" />
            </Button>
          </Link>
        </div>
        <nav className="grid gap-1 p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/${locale}/home`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      asPath.includes('home') ? 'bg-muted' : ''
                    }`}
                    aria-label="Playground"
                  >
                    <MonitorPlay className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                {t('tasks')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/${locale}/modelsControl`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      asPath.includes('modelsControl') ? 'bg-muted' : ''
                    }`}
                    aria-label="Models"
                  >
                    <BotIcon className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                {t('modelManagement')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/${locale}/translateControl`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      asPath.includes('translateControl') ? 'bg-muted' : ''
                    }`}
                    aria-label="Translate"
                  >
                    <Languages className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                {t('translationManagement')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/${locale}/settings`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      asPath.includes('settings') ? 'bg-muted' : ''
                    }`}
                    aria-label="Settings"
                  >
                    <Settings className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                {t('settings')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
        <nav className="mt-auto grid gap-1 p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild className="w-10">
                <Github
                  onClick={() =>
                    openUrl('https://github.com/buxuku/video-subtitle-master')
                  }
                  className="inline-block cursor-pointer"
                />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Github
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
      </aside>
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4">
          <h4 className="text-base font-semibold">
            {t('headerTitle')}
          </h4>
        </header>
        <main className="">{children}</main>
        <Toaster />
      </div>
    </div>
  );
};

export default Layout;
