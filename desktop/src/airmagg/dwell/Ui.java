package airmagg.dwell;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.util.Locale;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.Scrollable;
import javax.swing.SwingConstants;
import javax.swing.UIManager;
import javax.swing.border.AbstractBorder;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.JTableHeader;

/** Colores, tipografia y piezas visuales comunes (tema oscuro). */
final class Ui {
    static final Color PAGE = new Color(0x111111);
    static final Color SIDE = new Color(0x0b0b0b);
    static final Color SURFACE = new Color(0x1a1a19);
    static final Color SURFACE_2 = new Color(0x222220);
    static final Color INK = Color.WHITE;
    static final Color INK_2 = new Color(0xc3c2b7);
    static final Color MUTED = new Color(0x898781);
    static final Color GRID = new Color(0x2c2c2a);
    static final Color BASELINE = new Color(0x383835);
    static final Color BORDER = new Color(255, 255, 255, 26);
    static final Color SERIES = new Color(0x3987e5);
    static final Color WARM = new Color(0xd95926);
    static final Color CRITICAL = new Color(0xe66767);
    static final Color WARNING = new Color(0xfab219);
    static final Color GOOD = new Color(0x0ca30c);
    static final Color INFO = new Color(0x3987e5);

    static final Locale ES = Locale.forLanguageTag("es-PE");
    static final String FAMILY = pickFamily();
    /** Para iconos del menu: en Windows "Segoe UI Symbol" trae los simbolos que "Segoe UI" no tiene. */
    static final String SYMBOL_FAMILY = pickSymbolFamily();

    private static final String[][] FALLBACK = {
            {"⛔", "●"}, {"⚠", "!"}, {"✓", "√"}, {"↗", "→"}, {"★", "*"}, {"◉", "●"}, {"∿", "~"}, {"▽", "▼"},
            {"▦", "■"}, {"➚", "→"}, {"☰", "≡"}, {"◎", "○"}, {"✕", "x"}, {"●", "•"}, {"○", "o"}, {"▲", "+"}, {"▼", "-"},
            {"√", "v"}, {"→", ">"}, {"≡", "="}, {"■", "#"}, {"•", "*"}};

    /** Cambia los simbolos que la fuente no puede dibujar por uno parecido (evita cuadraditos). */
    static String safe(String s, Font f) {
        if (s == null || f == null || f.canDisplayUpTo(s) == -1) return s;
        StringBuilder b = new StringBuilder();
        s.codePoints().forEach(cp -> {
            String c = new String(Character.toChars(cp));
            int guard = 0;
            while (!f.canDisplay(cp) && guard++ < 4) {
                String alt = null;
                for (String[] m : FALLBACK) if (m[0].equals(c)) alt = m[1];
                if (alt == null) break;
                c = alt;
                cp = c.codePointAt(0);
            }
            b.append(c);
        });
        return b.toString();
    }

    private static String pickSymbolFamily() {
        java.util.Set<String> have = java.util.Set.of(
                java.awt.GraphicsEnvironment.getLocalGraphicsEnvironment().getAvailableFontFamilyNames());
        for (String w : new String[]{"Segoe UI Symbol", "DejaVu Sans"}) if (have.contains(w)) return w;
        return pickFamily();
    }

    private Ui() {}

    private static String pickFamily() {
        String[] wanted = {"Segoe UI", "Inter", "DejaVu Sans", "SansSerif"};
        java.util.Set<String> have = java.util.Set.of(
                java.awt.GraphicsEnvironment.getLocalGraphicsEnvironment().getAvailableFontFamilyNames());
        for (String w : wanted) if (have.contains(w)) return w;
        return Font.SANS_SERIF;
    }

    static Font font(int style, float size) { return new Font(FAMILY, style, Math.round(size)); }

    static void installDefaults() {
        // Si esta FlatLaf al lado (lib\flatlaf.jar), se usa; si no, Swing con colores oscuros.
        try {
            Class.forName("com.formdev.flatlaf.FlatDarkLaf").getMethod("setup").invoke(null);
        } catch (Throwable ignored) {
            try { UIManager.setLookAndFeel("javax.swing.plaf.metal.MetalLookAndFeel"); } catch (Exception e) { /* nada */ }
        }
        Font base = font(Font.PLAIN, 13);
        for (String k : new String[]{"Label", "Button", "ComboBox", "Table", "TableHeader", "TextField",
                "PasswordField", "TextArea", "CheckBox", "OptionPane", "List", "ToolTip"}) {
            UIManager.put(k + ".font", base);
        }
        UIManager.put("Panel.background", PAGE);
        UIManager.put("OptionPane.background", SURFACE);
        UIManager.put("OptionPane.messageForeground", INK);
        UIManager.put("Label.foreground", INK);
        UIManager.put("ComboBox.background", SURFACE_2);
        UIManager.put("ComboBox.foreground", INK);
        UIManager.put("ComboBox.selectionBackground", SERIES);
        UIManager.put("ComboBox.selectionForeground", Color.WHITE);
        UIManager.put("ComboBox.buttonBackground", SURFACE_2);
        UIManager.put("List.background", SURFACE_2);
        UIManager.put("List.foreground", INK);
        UIManager.put("TextField.background", SURFACE_2);
        UIManager.put("TextField.foreground", INK);
        UIManager.put("TextField.caretForeground", INK);
        UIManager.put("PasswordField.background", SURFACE_2);
        UIManager.put("PasswordField.foreground", INK);
        UIManager.put("PasswordField.caretForeground", INK);
        UIManager.put("CheckBox.background", SURFACE);
        UIManager.put("CheckBox.foreground", INK);
        UIManager.put("ScrollBar.background", PAGE);
        UIManager.put("ScrollBar.thumb", BASELINE);
        UIManager.put("ScrollBar.track", PAGE);
        UIManager.put("ToolTip.background", SURFACE_2);
        UIManager.put("ToolTip.foreground", INK);
        UIManager.put("Button.background", SURFACE_2);
        UIManager.put("Button.foreground", INK);
    }

    // ---- formatos ----
    static String time(double ms) {
        long s = Math.round(ms / 1000);
        if (s < 60) return s + " s";
        return (s / 60) + " min " + String.format("%02d", s % 60) + " s";
    }

    static String pct(double v) {
        if (Math.abs(v - Math.round(v)) < 0.05) return Math.round(v) + "%";
        return String.format(ES, "%.1f%%", v);
    }

    static String n(double v) { return String.format(ES, "%,d", Math.round(v)); }

    static void aa(Graphics2D g) {
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB);
    }

    // ---- piezas ----
    static JLabel label(String text, int style, float size, Color color) {
        Font f = font(style, size);
        JLabel l = new JLabel(text != null && text.startsWith("<html>") ? text : safe(text, f));
        l.setFont(f);
        l.setForeground(color);
        return l;
    }

    static JTextArea paragraph(String text, float size, Color color) {
        JTextArea t = new JTextArea(safe(text, font(Font.PLAIN, size))) {
            // No crecer mas de lo que ocupa el texto (en BoxLayout)
            @Override public Dimension getMaximumSize() { return new Dimension(Integer.MAX_VALUE, getPreferredSize().height); }
        };
        t.setLineWrap(true);
        t.setWrapStyleWord(true);
        t.setEditable(false);
        t.setFocusable(false);
        t.setOpaque(false);
        t.setBorder(null);
        t.setFont(font(Font.PLAIN, size));
        t.setForeground(color);
        return t;
    }

    static JButton button(String text, boolean primary) {
        JButton b = new JButton(text) {
            @Override protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                aa(g2);
                Color bg = primary ? SERIES : SURFACE_2;
                if (getModel().isRollover()) bg = primary ? SERIES.brighter() : BASELINE;
                g2.setColor(bg);
                g2.fillRoundRect(0, 0, getWidth() - 1, getHeight() - 1, 8, 8);
                if (!primary) {
                    g2.setColor(BORDER);
                    g2.drawRoundRect(0, 0, getWidth() - 1, getHeight() - 1, 8, 8);
                }
                g2.dispose();
                super.paintComponent(g);
            }
        };
        b.setContentAreaFilled(false);
        b.setBorderPainted(false);
        b.setFocusPainted(false);
        b.setOpaque(false);
        b.setForeground(primary ? Color.WHITE : INK);
        b.setFont(font(Font.PLAIN, 13));
        b.setBorder(BorderFactory.createEmptyBorder(6, 14, 6, 14));
        b.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        return b;
    }

    /** Tarjeta con borde redondeado. */
    static JPanel card() {
        JPanel p = new JPanel();
        p.setBackground(SURFACE);
        p.setBorder(BorderFactory.createCompoundBorder(new Round(BORDER, 12), BorderFactory.createEmptyBorder(14, 16, 14, 16)));
        return p;
    }

    static final class Round extends AbstractBorder {
        private final Color color;
        private final int r;
        Round(Color color, int r) { this.color = color; this.r = r; }
        @Override public void paintBorder(Component c, Graphics g, int x, int y, int w, int h) {
            Graphics2D g2 = (Graphics2D) g.create();
            aa(g2);
            g2.setColor(color);
            g2.setStroke(new BasicStroke(1));
            g2.drawRoundRect(x, y, w - 1, h - 1, r, r);
            g2.dispose();
        }
        @Override public java.awt.Insets getBorderInsets(Component c) { return new java.awt.Insets(1, 1, 1, 1); }
    }

    /** Barra horizontal de una sola serie, con extremo redondeado. */
    static void bar(Graphics2D g, int x, int y, int w, int h, double value, double max, Color color) {
        g.setColor(BASELINE);
        g.fillRect(x, y - 2, 1, h + 4);
        if (max <= 0 || value <= 0) return;
        int bw = (int) Math.max(2, Math.round(w * Math.min(value / max, 1)));
        g.setColor(color);
        g.fillRoundRect(x, y, bw, h, 6, 6);
        g.fillRect(x, y, Math.min(bw, 4), h);
    }

    static JTable table(javax.swing.table.TableModel model) {
        JTable t = new JTable(model);
        t.setBackground(SURFACE);
        t.setForeground(INK);
        t.setGridColor(GRID);
        t.setShowVerticalLines(false);
        t.setRowHeight(34);
        t.setFillsViewportHeight(true);
        t.setSelectionBackground(new Color(0x1d3557));
        t.setSelectionForeground(INK);
        t.setFont(font(Font.PLAIN, 13));
        t.setIntercellSpacing(new Dimension(0, 1));
        JTableHeader h = t.getTableHeader();
        h.setReorderingAllowed(false);
        h.setDefaultRenderer(new DefaultTableCellRenderer() {
            @Override public Component getTableCellRendererComponent(JTable tb, Object v, boolean s, boolean f, int r, int c) {
                JLabel l = (JLabel) super.getTableCellRendererComponent(tb, v, false, false, r, c);
                l.setBackground(SURFACE);
                l.setForeground(INK_2);
                l.setFont(font(Font.PLAIN, 12));
                l.setBorder(BorderFactory.createCompoundBorder(
                        BorderFactory.createMatteBorder(0, 0, 1, 0, BASELINE), BorderFactory.createEmptyBorder(6, 8, 6, 8)));
                l.setHorizontalAlignment(tb.getModel().getColumnClass(c) == Number.class ? SwingConstants.RIGHT : SwingConstants.LEFT);
                return l;
            }
        });
        DefaultTableCellRenderer cell = new DefaultTableCellRenderer() {
            @Override public Component getTableCellRendererComponent(JTable tb, Object v, boolean s, boolean f, int r, int c) {
                JLabel l = (JLabel) super.getTableCellRendererComponent(tb, v, s, false, r, c);
                l.setText(safe(l.getText(), l.getFont()));
                l.setBorder(BorderFactory.createEmptyBorder(0, 8, 0, 8));
                if (!s) l.setBackground(SURFACE);
                l.setForeground(INK);
                return l;
            }
        };
        t.setDefaultRenderer(Object.class, cell);
        return t;
    }

    static JScrollPane scroll(JComponent c) {
        JScrollPane sp = new JScrollPane(c);
        sp.setBorder(null);
        sp.getViewport().setBackground(c.getBackground());
        sp.getVerticalScrollBar().setUnitIncrement(18);
        sp.setBackground(c.getBackground());
        return sp;
    }

    /** Panel que se ajusta al ancho del area de scroll (para que el texto haga salto de linea). */
    static class Page extends JPanel implements Scrollable {
        Page() { setBackground(PAGE); }
        @Override public Dimension getPreferredScrollableViewportSize() { return getPreferredSize(); }
        @Override public int getScrollableUnitIncrement(Rectangle r, int o, int d) { return 18; }
        @Override public int getScrollableBlockIncrement(Rectangle r, int o, int d) { return r.height - 40; }
        @Override public boolean getScrollableTracksViewportWidth() { return true; }
        @Override public boolean getScrollableTracksViewportHeight() { return false; }
    }
}
