import Button from '../../components/Button.jsx';
import TextField from '../../components/TextField.jsx';
import FormError from './FormError.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useAuthForm } from './useAuthForm.js';
import { validateLogin } from '../../lib/authValidation.js';

export default function LoginForm() {
  const { login } = useAuth();
  const { values, fieldErrors, formError, isSaving, handleChange, handleSubmit } = useAuthForm({
    initialValues: { email: '', password: '' },
    validate: validateLogin,
    onSubmit: login,
  });

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormError message={formError} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={handleChange}
        error={fieldErrors.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={values.password}
        onChange={handleChange}
        error={fieldErrors.password}
      />
      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}
