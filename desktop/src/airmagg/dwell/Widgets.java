package airmagg.dwell;

import java.awt.BasicStroke;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.GridLayout;
import java.awt.RadialGradientPaint;
import java.util.List;
import java.util.Map;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTable;
import javax.swing.table.AbstractTableModel;
import javax.swing.table.DefaultTableCellRenderer;

import static airmagg.dwell.Json.num;
import static airmagg.dwell.Json.obj;
import static airmagg.dwell.Json.str;

/** Graficos y bloques visuales de la app. */
final class Widgets {
    private Widgets() {}

    static final Color HEAT = new Color(235, 104, 52);

    /** Mapa de calor: la pagina entera de arriba abajo (0% a 100% de alto). */
    static final class HeatPanel extends JComponent {
        private final Map<String, Object> heat;
        private final boolean showLive;

        HeatPanel(Map<String, Object> heat, int w, int h, boolean showLive) {
            this.heat = heat;
            this.showLive = showLive;
            setPreferredSize(new Dimension(w, h));
            setMinimumSize(new Dimension(Math.min(w, 200), h));
            setMaximumSize(new Dimension(w, h));
        }

        @Override protected void paintComponent(Graphics g0) {
            Graphics2D g = (Graphics2D) g0.create();
            Ui.aa(g);
            int w = getWidth(), h = getHeight();
            g.setColor(Ui.PAGE);
            g.fillRoundRect(0, 0, w - 1, h - 1, 10, 10);
            g.setFont(Ui.font(Font.PLAIN, 10));
            for (int i = 0; i <= 10; i++) {
                int y = (int) Math.round(i / 10.0 * (h - 1));
                g.setColor(Ui.GRID);
                g.drawLine(1, y, w - 2, y);
                if (i < 10) {
                    g.setColor(Ui.MUTED);
                    g.drawString(i * 10 + "%", 4, y + 12);
                }
            }
            if (heat == null) { g.dispose(); return; }
            for (Object o : Json.list(heat.get("moves"))) {
                List<Object> m = Json.list(o);
                if (m.size() < 2) continue;
                float x = (float) (num(m.get(0)) / 1000 * w), y = (float) (num(m.get(1)) / 1000 * h);
                g.setPaint(new RadialGradientPaint(x, y, 16, new float[]{0f, 1f},
                        new Color[]{new Color(235, 104, 52, 80), new Color(235, 104, 52, 0)}));
                g.fillRect((int) x - 16, (int) y - 16, 32, 32);
            }
            for (Object o : Json.list(heat.get("clicks"))) {
                List<Object> c = Json.list(o);
                if (c.size() < 3) continue;
                ring(g, num(c.get(0)) / 1000 * w, num(c.get(1)) / 1000 * h, 4, num(c.get(2)) > 0 ? Ui.GOOD : Ui.INK, num(c.get(2)) > 0);
            }
            if (showLive) {
                Map<String, Object> live = obj(heat.get("live"));
                g.setColor(new Color(57, 135, 229, 150));
                for (Object o : Json.list(live.get("moves"))) {
                    List<Object> m = Json.list(o);
                    if (m.size() < 2) continue;
                    g.fillOval((int) (num(m.get(0)) / 1000 * w) - 3, (int) (num(m.get(1)) / 1000 * h) - 3, 6, 6);
                }
                for (Object o : Json.list(live.get("clicks"))) {
                    List<Object> c = Json.list(o);
                    if (c.size() < 2) continue;
                    ring(g, num(c.get(0)) / 1000 * w, num(c.get(1)) / 1000 * h, 6, Ui.SERIES, false);
                }
            }
            g.setColor(Ui.BORDER);
            g.drawRoundRect(0, 0, w - 1, h - 1, 10, 10);
            g.dispose();
        }

        private static void ring(Graphics2D g, double x, double y, int r, Color c, boolean fill) {
            int ix = (int) Math.round(x) - r, iy = (int) Math.round(y) - r;
            if (fill) { g.setColor(c); g.fillOval(ix, iy, r * 2, r * 2); }
            g.setStroke(new BasicStroke(2.5f));
            g.setColor(Ui.PAGE);
            g.drawOval(ix, iy, r * 2, r * 2);
            g.setStroke(new BasicStroke(1.4f));
            g.setColor(c);
            g.drawOval(ix, iy, r * 2, r * 2);
        }
    }

    /** "Donde se caen": por cada 10% de altura, cuantos llegan y cuanto tiempo pasan. */
    static final class DepthPanel extends JComponent {
        private final Map<String, Object> depth;
        private static final int ROW = 34;

        DepthPanel(Map<String, Object> depth) {
            this.depth = depth;
            setPreferredSize(new Dimension(900, ROW * 10 + 30));
            setMaximumSize(new Dimension(Integer.MAX_VALUE, ROW * 10 + 30));
            setAlignmentX(LEFT_ALIGNMENT);
        }

        @Override protected void paintComponent(Graphics g0) {
            Graphics2D g = (Graphics2D) g0.create();
            Ui.aa(g);
            List<Object> bands = Json.list(depth.get("bands"));
            double maxMs = 1;
            for (Object b : bands) maxMs = Math.max(maxMs, num(obj(b).get("avgMs")));
            int w = getWidth();
            int col1 = 80, barW = Math.max(120, (w - col1 - 380) / 2), col2 = col1 + 60, col3 = col2 + barW + 70, col4 = col3 + barW + 16;
            g.setFont(Ui.font(Font.PLAIN, 12));
            g.setColor(Ui.INK_2);
            g.drawString("Altura", 0, 14);
            g.drawString("Cuántos llegan", col1, 14);
            g.drawString("Tiempo ahí (dwell por altura)", col2 + barW + 10, 14);
            int y = 30;
            for (Object o : bands) {
                Map<String, Object> b = obj(o);
                boolean drop = Json.bool(b.get("biggestDrop"));
                boolean hot = Json.bool(b.get("hottest"));
                if (drop) {
                    g.setColor(new Color(230, 103, 103, 30));
                    g.fillRect(0, y, w, ROW);
                }
                g.setColor(Ui.GRID);
                g.drawLine(0, y + ROW - 1, w, y + ROW - 1);
                g.setFont(Ui.font(Font.PLAIN, 13));
                g.setColor(Ui.INK);
                g.drawString((int) num(b.get("from")) + "–" + (int) num(b.get("to")) + "%", 0, y + 22);
                g.drawString(Ui.pct(num(b.get("reachPct"))), col1, y + 22);
                Ui.bar(g, col2, y + 11, barW, 12, num(b.get("reachPct")), 100, Ui.SERIES);
                g.setColor(Ui.INK);
                String t = Ui.time(num(b.get("avgMs")));
                g.drawString(t, col3 - g.getFontMetrics().stringWidth(t) - 8, y + 22);
                Ui.bar(g, col3, y + 11, barW, 12, num(b.get("avgMs")), maxMs, Ui.WARM);
                g.setFont(Ui.font(Font.BOLD, 12));
                if (drop) {
                    g.setColor(Ui.CRITICAL);
                    g.drawString(Ui.safe("⚠ Mayor caída (−" + Ui.pct(num(obj(depth.get("biggestDrop")).get("d"))) + ")", g.getFont()), col4 + barW / 4, y + 22);
                } else if (hot) {
                    g.setColor(Ui.INK);
                    g.drawString(Ui.safe("● Aquí está tu dwell", g.getFont()), col4 + barW / 4, y + 22);
                }
                y += ROW;
            }
            g.dispose();
        }
    }

    /** Visitas por dia (una barra por dia). */
    static final class MiniDays extends JComponent {
        private final List<Object> daily;

        MiniDays(List<Object> daily) {
            this.daily = daily;
            setPreferredSize(new Dimension(400, 70));
            setMaximumSize(new Dimension(Integer.MAX_VALUE, 70));
            StringBuilder tip = new StringBuilder("<html>");
            for (Object o : daily) {
                Map<String, Object> d = obj(o);
                tip.append(str(d.get("day"))).append(": ").append(Ui.n(num(d.get("views")))).append(" visitas · dwell ")
                        .append(Ui.time(num(d.get("medianDwellMs")))).append("<br>");
            }
            setToolTipText(tip.append("</html>").toString());
        }

        @Override protected void paintComponent(Graphics g0) {
            Graphics2D g = (Graphics2D) g0.create();
            Ui.aa(g);
            int n = Math.max(daily.size(), 1), w = getWidth(), h = getHeight() - 16;
            double max = 1;
            for (Object o : daily) max = Math.max(max, num(obj(o).get("views")));
            int gap = 3, bw = (w - gap * (n - 1)) / n;
            for (int i = 0; i < daily.size(); i++) {
                double v = num(obj(daily.get(i)).get("views"));
                if (v <= 0) continue;
                int bh = (int) Math.max(3, Math.round(v / max * (h - 4)));
                g.setColor(Ui.SERIES);
                g.fillRoundRect(i * (bw + gap), h - bh, bw, bh, 5, 5);
                g.fillRect(i * (bw + gap), h - Math.min(bh, 4), bw, Math.min(bh, 4));
            }
            g.setColor(Ui.BASELINE);
            g.drawLine(0, h, w, h);
            g.setColor(Ui.MUTED);
            g.setFont(Ui.font(Font.PLAIN, 10));
            if (!daily.isEmpty()) g.drawString(str(obj(daily.get(0)).get("day")).substring(5), 0, h + 13);
            g.drawString("hoy", w - g.getFontMetrics().stringWidth("hoy"), h + 13);
            g.dispose();
        }
    }

    /** Celda de tabla con valor + barra. */
    static final class BarRenderer extends DefaultTableCellRenderer {
        private final double max;
        private final Color color;
        private double value;

        BarRenderer(double max, Color color) { this.max = max; this.color = color; }

        @Override public Component getTableCellRendererComponent(JTable t, Object v, boolean s, boolean f, int r, int c) {
            super.getTableCellRendererComponent(t, "", s, false, r, c);
            value = v instanceof Number ? ((Number) v).doubleValue() : 0;
            if (!s) setBackground(Ui.SURFACE);
            return this;
        }

        @Override protected void paintComponent(Graphics g0) {
            super.paintComponent(g0);
            Graphics2D g = (Graphics2D) g0.create();
            Ui.aa(g);
            Ui.bar(g, 6, getHeight() / 2 - 6, getWidth() - 14, 12, value, max, color);
            g.dispose();
        }
    }

    // ---------------- bloques ----------------

    static JPanel tile(String label, String value, String hint) {
        JPanel p = Ui.card();
        p.setLayout(new BoxLayout(p, BoxLayout.Y_AXIS));
        p.add(Ui.label(label, Font.PLAIN, 12, Ui.INK_2));
        p.add(Box.createVerticalStrut(4));
        p.add(Ui.label(value, Font.BOLD, 24, Ui.INK));
        if (hint != null) p.add(Ui.label(hint, Font.PLAIN, 11, Ui.MUTED));
        return p;
    }

    static JPanel tiles(JPanel... items) {
        JPanel row = new JPanel(new GridLayout(1, items.length, 12, 0));
        row.setOpaque(false);
        for (JPanel t : items) row.add(t);
        row.setAlignmentX(Component.LEFT_ALIGNMENT);
        row.setMaximumSize(new Dimension(Integer.MAX_VALUE, 110));
        return row;
    }

    /** Tarjeta con titulo y subtitulo; devuelve el cuerpo para agregar cosas. */
    static JPanel section(JPanel page, String title, String sub) {
        JPanel card = Ui.card();
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
        card.setAlignmentX(Component.LEFT_ALIGNMENT);
        JLabel t = Ui.label(title, Font.BOLD, 16, Ui.INK);
        t.setAlignmentX(Component.LEFT_ALIGNMENT);
        card.add(t);
        if (sub != null) {
            JComponent s = Ui.paragraph(sub, 12.5f, Ui.INK_2);
            s.setAlignmentX(Component.LEFT_ALIGNMENT);
            card.add(Box.createVerticalStrut(3));
            card.add(s);
        }
        card.add(Box.createVerticalStrut(10));
        page.add(card);
        page.add(Box.createVerticalStrut(14));
        return card;
    }

    static JComponent text(String s, float size, Color c) {
        JComponent p = Ui.paragraph(s, size, c);
        p.setAlignmentX(Component.LEFT_ALIGNMENT);
        return p;
    }

    static final String[][] LEVELS = {
            {"critical", "● ARREGLA ESTO PRIMERO"}, {"warning", "⚠ MEJORABLE"}, {"info", "ℹ DATO"}, {"good", "✓ ESTO YA ESTÁ BIEN"}};

    static Color levelColor(String level) {
        switch (level) {
            case "critical": return Ui.CRITICAL;
            case "warning": return Ui.WARNING;
            case "good": return Ui.GOOD;
            default: return Ui.INFO;
        }
    }

    static String levelLabel(String level) {
        for (String[] l : LEVELS) if (l[0].equals(level)) return l[1];
        return level;
    }

    static int levelOrder(String level) {
        for (int i = 0; i < LEVELS.length; i++) if (LEVELS[i][0].equals(level)) return i;
        return 9;
    }

    static JPanel insight(Map<String, Object> it) {
        String level = str(it.get("level"));
        JPanel p = new JPanel();
        p.setLayout(new BoxLayout(p, BoxLayout.Y_AXIS));
        p.setBackground(Ui.SURFACE);
        p.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(0, 3, 0, 0, levelColor(level)), BorderFactory.createEmptyBorder(6, 12, 6, 6)));
        p.setAlignmentX(Component.LEFT_ALIGNMENT);
        JLabel tag = Ui.label(levelLabel(level), Font.BOLD, 11, level.equals("critical") ? Ui.CRITICAL : Ui.INK_2);
        tag.setAlignmentX(Component.LEFT_ALIGNMENT);
        p.add(tag);
        JComponent title = Ui.paragraph(str(it.get("title")), 14, Ui.INK);
        title.setFont(Ui.font(Font.BOLD, 14));
        title.setAlignmentX(Component.LEFT_ALIGNMENT);
        p.add(title);
        p.add(text(str(it.get("detail")), 12.5f, Ui.INK_2));
        return p;
    }

    static JPanel legend(boolean live) {
        JPanel p = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        p.setOpaque(false);
        p.add(dot(HEAT, false, "cursor"));
        p.add(dot(Ui.INK, true, "clic"));
        p.add(dot(Ui.GOOD, false, "compra"));
        if (live) p.add(dot(Ui.SERIES, false, "ahora"));
        p.setAlignmentX(Component.LEFT_ALIGNMENT);
        p.setMaximumSize(new Dimension(Integer.MAX_VALUE, 22));
        return p;
    }

    private static JLabel dot(Color c, boolean ring, String text) {
        JLabel l = Ui.label(text, Font.PLAIN, 11, Ui.INK_2);
        l.setIcon(new javax.swing.Icon() {
            public void paintIcon(Component comp, Graphics g0, int x, int y) {
                Graphics2D g = (Graphics2D) g0.create();
                Ui.aa(g);
                g.setColor(c);
                if (ring) { g.setStroke(new BasicStroke(1.6f)); g.drawOval(x + 1, y + 1, 8, 8); }
                else g.fillOval(x, y, 10, 10);
                g.dispose();
            }
            public int getIconWidth() { return 10; }
            public int getIconHeight() { return 10; }
        });
        return l;
    }

    /** Tabla sencilla a partir de filas. */
    static final class Rows extends AbstractTableModel {
        final String[] cols;
        final Class<?>[] types;
        final List<Object[]> rows;

        Rows(String[] cols, Class<?>[] types, List<Object[]> rows) { this.cols = cols; this.types = types; this.rows = rows; }
        public int getRowCount() { return rows.size(); }
        public int getColumnCount() { return cols.length; }
        public Object getValueAt(int r, int c) { return rows.get(r)[c]; }
        @Override public String getColumnName(int c) { return cols[c]; }
        @Override public Class<?> getColumnClass(int c) { return types[c]; }
    }

    /** Tabla sin barra de scroll propia (crece con sus filas). */
    static JPanel tablePanel(JTable t) {
        JPanel p = new JPanel(new BorderLayout());
        p.setOpaque(false);
        p.add(t.getTableHeader(), BorderLayout.NORTH);
        p.add(t, BorderLayout.CENTER);
        p.setAlignmentX(Component.LEFT_ALIGNMENT);
        DefaultTableCellRenderer right = new DefaultTableCellRenderer() {
            @Override public Component getTableCellRendererComponent(JTable tb, Object v, boolean s, boolean f, int r, int c) {
                super.getTableCellRendererComponent(tb, v, s, false, r, c);
                setHorizontalAlignment(RIGHT);
                setText(Ui.safe(getText(), getFont()));
                setBorder(BorderFactory.createEmptyBorder(0, 8, 0, 8));
                if (!s) setBackground(Ui.SURFACE);
                setForeground(Ui.INK);
                return this;
            }
        };
        for (int c = 0; c < t.getColumnCount(); c++) {
            if (t.getModel().getColumnClass(c) == Number.class) t.getColumnModel().getColumn(c).setCellRenderer(right);
        }
        return p;
    }

    static String fitText(String s, FontMetrics fm, int w) {
        if (fm.stringWidth(s) <= w) return s;
        while (s.length() > 1 && fm.stringWidth(s + "…") > w) s = s.substring(0, s.length() - 1);
        return s + "…";
    }
}
