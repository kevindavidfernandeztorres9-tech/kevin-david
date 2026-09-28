export default async function Login({ searchParams }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <form method="post" action="/api/login" className="card">
        <h1>Dwell en tiempo real</h1>
        <label htmlFor="password">Contraseña del panel</label>
        <input id="password" name="password" type="password" autoFocus required />
        {error && <p className="error">Contraseña incorrecta.</p>}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
