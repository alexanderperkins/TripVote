import Button from '../../components/Button.jsx';
import TextField from '../../components/TextField.jsx';
import FormError from './FormError.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useAuthForm } from './useAuthForm.js';
import { validateSignup } from '../../lib/authValidation.js';

export default function SignupForm() {
  const { register } = useAuth();
  const { values, fieldErrors, formError, isSaving, handleChange, handleSubmit } = useAuthForm({
    initialValues: { name: '', email: '', password: '' },
    validate: validateSignup,
    onSubmit: register,
  });

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormError message={formError} />
      <TextField
        label="Name"
        name="name"
        autoComplete="name"
        value={values.name}
        onChange={handleChange}
        error={fieldErrors.name}
      />
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
        autoComplete="new-password"
        value={values.password}
        onChange={handleChange}
        error={fieldErrors.password}
      />
      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
