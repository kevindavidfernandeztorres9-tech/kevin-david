package airmagg.dwell;

import java.io.File;
import javax.swing.SwingUtilities;

/** Dwell en Tiempo Real · airmaggnature (app de escritorio). */
public final class Main {
    private Main() {}

    public static void main(String[] args) {
        System.setProperty("awt.useSystemAAFontSettings", "lcd");
        System.setProperty("swing.aatext", "true");
        SwingUtilities.invokeLater(() -> {
            Ui.installDefaults();
            Config cfg = new Config();
            String token = System.getProperty("dwell.password") != null ? loginWith(cfg, System.getProperty("dwell.password")) : cfg.get("token", "");
            if (token == null || token.isEmpty()) {
                token = MainFrame.askLogin(null, cfg, "Entra con la misma contraseña de tu panel web.");
                if (token == null) System.exit(0);
            }
            MainFrame f = new MainFrame(cfg, token);
            f.setVisible(true);
            String snap = System.getProperty("dwell.snapshot");
            if (snap != null) f.snapshots(new File(snap));
        });
    }

    private static String loginWith(Config cfg, String password) {
        try {
            String t = Api.login(cfg.url(), password);
            cfg.set("token", t);
            return t;
        } catch (Exception e) {
            return null;
        }
    }
}
