'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useLogin } from '@/lib/auth/use-auth';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

const DEMO = { email: 'owner@demo.dataroom', password: 'Password123!' };

export default function LoginPage() {
  const login = useLogin();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit((values) => login.mutate(values));

  // Credentials are wrong as a pair; blaming one field would be a guess and would also tell
  // an attacker which half they got right.
  const credentialsRejected =
    login.error instanceof ApiError && login.error.code === 'INVALID_CREDENTIALS';

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h2 className="text-base font-semibold">Sign in</h2>
        <p className="mt-1 text-sm text-muted">Access the data rooms shared with you.</p>
      </div>

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />

      {login.error && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {credentialsRejected
            ? 'That email and password do not match an account.'
            : (login.error as Error).message}
        </p>
      )}

      <Button type="submit" variant="primary" loading={login.isPending} className="w-full">
        Sign in
      </Button>

      <div className="space-y-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={login.isPending}
          onClick={() => {
            // Fills the form instead of signing in directly, so a reviewer can see the
            // credentials being used rather than landing inside an account by magic.
            form.setValue('email', DEMO.email);
            form.setValue('password', DEMO.password);
          }}
        >
          Use the demo account
        </Button>
        <p className="text-center text-sm text-muted">
          No account?{' '}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </form>
  );
}
