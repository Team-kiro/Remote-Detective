import { config } from '@/config';
import styles from '@/App.module.css';

export function App(): React.JSX.Element {
  return (
    <main className={styles.shell}>
      <section className={styles.caseFile} aria-labelledby="app-title">
        <p className={styles.classification}>EXPEDIENTE CONFIDENCIAL</p>
        <h1 id="app-title">REMOTE DETECTIVE</h1>
        <p>La investigación local está lista.</p>
        <span className={styles.status} role="status">
          Modo de interrogación: {config.interrogationMode}
        </span>
      </section>
    </main>
  );
}
