package airmagg.dwell;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/** Preferencias guardadas en %APPDATA%\DwellAirmagg\config.properties */
final class Config {
    static final String DEFAULT_URL = "https://dwell-tiendas1.vercel.app";
    private final Properties p = new Properties();
    private final Path file;

    Config() {
        String appData = System.getenv("APPDATA");
        Path dir = appData != null ? Path.of(appData, "DwellAirmagg") : Path.of(System.getProperty("user.home"), ".dwell-airmagg");
        file = dir.resolve("config.properties");
        try (InputStream in = Files.newInputStream(file)) {
            p.load(in);
        } catch (IOException ignored) {
            // primera vez
        }
        String override = System.getProperty("dwell.url");
        if (override != null) p.setProperty("url", override);
    }

    String get(String k, String def) { return p.getProperty(k, def); }

    void set(String k, String v) {
        if (v == null) p.remove(k); else p.setProperty(k, v);
        try {
            Files.createDirectories(file.getParent());
            try (OutputStream out = Files.newOutputStream(file)) {
                p.store(out, "Dwell airmaggnature");
            }
        } catch (IOException ignored) {
            // si no se puede guardar, solo se pierde la preferencia
        }
    }

    String url() { return get("url", DEFAULT_URL); }
}
