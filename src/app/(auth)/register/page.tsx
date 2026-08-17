'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useRegister } from '@/lib/auth/use-auth';

// Mirrors what the API accepts. Client-side validation is for fast feedback; the server's
// answer remains the authority, and its field errors are surfaced below.
const schema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(120),
  email: z.email('Enter a valid email address'),
  password: z.string().min(10, 'Use at least 10 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const register = useRegister();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const submit = form.handleSubmit((values) => register.mutate(values));
  const emailTaken = register.error instanceof ApiError && register.error.code === 'EMAIL_TAKEN';

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h2 className="text-base font-semibold">Create an account</h2>
        <p className="mt-1 text-sm text-muted">You will be able to create and share data rooms.</p>
      </div>

      <Field
        label="Name"
        autoComplete="name"
        autoFocus
        error={form.formState.errors.displayName?.message}
        {...form.register('displayName')}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        // The server owns this rule, so its answer is attached to the field the user must fix.
        error={form.formState.errors.email?.message ?? (emailTaken ? 'That email is already registered' : undefined)}
        {...form.register('email')}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />

      {register.error && !emailTaken && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {(register.error as Error).message}
        </p>
      )}

      <Button type="submit" variant="primary" loading={register.isPending} className="w-full">
        Create account
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
