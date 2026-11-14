import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import Icon from '@/components/ui/icon';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout
            title={t('auth.login')}
            description={t('auth.welcome_subtitle')}
        >
            <Head title={t('auth.login')} />

            <form className="flex flex-col gap-3" onSubmit={submit}>
                <div className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="email" className="text-xs">{t('auth.email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="user@example.com"
                            className="text-start h-9 text-xs"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="password" className="text-xs">{t('auth.password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="********"
                            className="text-start h-9 text-xs"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="remember"
                                name="remember"
                                checked={data.remember}
                                onClick={() => setData('remember', !data.remember)}
                                tabIndex={3}
                            />
                            <Label htmlFor="remember" className="cursor-pointer text-xs">{t('auth.remember_me')}</Label>
                        </div>
                        {canResetPassword && (
                            <TextLink href={route('password.request')} className="text-xs" tabIndex={5}>
                                {t('auth.forgot_password')}
                            </TextLink>
                        )}
                    </div>

                    <Button type="submit" className="mt-1 h-9 w-full cursor-pointer text-xs font-semibold" tabIndex={4} disabled={processing}>
                        {processing && <Icon name="SpinnerIcon" className="h-4 w-4 animate-spin me-2" />}
                        {t('auth.login')}
                    </Button>
                </div>
            </form>

            {status && <div className="mt-2 text-center text-xs font-medium text-emerald-600">{status}</div>}
        </AuthLayout>
    );
}
