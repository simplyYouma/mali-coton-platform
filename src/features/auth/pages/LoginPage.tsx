import { useState, type FormEvent } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button, FormField, Input } from '@/components/common';
import { useLogin } from '../hooks/useLogin';
import styles from './LoginPage.module.css';

const DEMO_ACCOUNTS = [
  { role: 'Administrateur', email: 'admin@pnud.org' },
  { role: 'Superviseur', email: 'superviseur@sahel.com' },
  { role: 'Agent terrain', email: 'agent.bamako@sahel.com' },
  { role: 'Agent laboratoire', email: 'labo@lne.gouv.ml' },
  { role: 'Observateur', email: 'observateur@pnud.org' },
];

export function LoginPage() {
  const [email, setEmail] = useState('admin@pnud.org');
  const [password, setPassword] = useState('demo');
  const login = useLogin();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <main className={styles.page}>
      <section className={styles.visual} aria-hidden="true">
        <div className={styles.visualOverlay}>
          <p className={styles.eyebrow}>Plateforme officielle</p>
          <h2 className={styles.visualTitle}>
            Suivi socio-environnemental des teintureries artisanales du Mali.
          </h2>
          <ul className={styles.metaList}>
            <li><span>5</span> sites pilotes</li>
            <li><span>6 mois</span> de collecte terrain</li>
            <li><span>40+</span> indicateurs suivis</li>
          </ul>
        </div>
      </section>

      <section className={styles.formPane}>
        <div className={styles.formCard}>
          <header className={styles.brand}>
            <span className={styles.brandMark}>MC</span>
            <div>
              <p className={styles.brandLabel}>Plateforme</p>
              <h1 className={styles.brandName}>Mali Coton</h1>
            </div>
          </header>

          <h2 className={styles.title}>Connexion</h2>

          <form onSubmit={onSubmit} className={styles.form} noValidate>
            <FormField label="Adresse e-mail" required>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefix={<Mail size={16} />}
                inputSize="lg"
                required
              />
            </FormField>

            <FormField label="Mot de passe" required>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                prefix={<Lock size={16} />}
                inputSize="lg"
                required
              />
            </FormField>

            {login.isError ? (
              <p className={styles.error} role="alert">
                {login.error instanceof Error ? login.error.message : 'Erreur d\'authentification.'}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={login.isPending}
              iconRight={<ArrowRight size={18} />}
            >
              Se connecter
            </Button>
          </form>

          <div className={styles.demoSection}>
            <p className={styles.demoTitle}>Comptes de démonstration</p>
            <ul className={styles.demoList}>
              {DEMO_ACCOUNTS.map((acc) => (
                <li key={acc.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword('demo');
                    }}
                    className={styles.demoButton}
                  >
                    <span className={styles.demoRole}>{acc.role}</span>
                    <span className={styles.demoEmail}>{acc.email}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className={styles.demoHint}>Mot de passe : <code>demo</code></p>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>© 2026 — Mali Coton</p>
        </footer>
      </section>
    </main>
  );
}
