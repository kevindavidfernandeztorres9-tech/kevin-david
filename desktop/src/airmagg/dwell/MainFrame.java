package airmagg.dwell;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Desktop;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.GridLayout;
import java.awt.Insets;
import java.awt.image.BufferedImage;
import java.io.File;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JComponent;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JPasswordField;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.Timer;

import static airmagg.dwell.Json.bool;
import static airmagg.dwell.Json.num;
import static airmagg.dwell.Json.obj;
import static airmagg.dwell.Json.str;

/** Ventana principal: menu lateral, filtros arriba, vista al centro, estado abajo. */
final class MainFrame extends JFrame {
    private static final int REFRESH_S = 15;
    private static final String[][] NAV = {
            {"#", "SEGUIMIENTO"}, {"mis", "★  Mis landings"},
            {"#", "EN VIVO"}, {"vivo", "∿  Todo en vivo"}, {"visitantes", "◉  Visitantes ahora"},
            {"#", "TU LANDING"}, {"caen", "▽  Dónde se caen"}, {"calor", "▦  Mapa de calor"},
            {"clics", "➚  Dónde hacen clic"}, {"secciones", "☰  Secciones"},
            {"#", "DECIDIR"}, {"arreglar", "◎  Qué arreglar"},
    };
    private static final String[][] RANGES = {{"1h", "Última hora"}, {"24h", "Últimas 24 h"}, {"7d", "Últimos 7 días"}, {"30d", "Últimos 30 días"}};
    private static final Map<String, String> RANGE_PREV = Map.of(
            "1h", "la hora anterior", "24h", "las 24 h anteriores", "7d", "los 7 días anteriores", "30d", "los 30 días anteriores");
    private static final Map<String, String> KIND = Map.of(
            "buy", "✓ Compra", "link", "Enlace", "button", "Botón", "media", "Imagen/video", "other", "Sin acción");

    private final Config cfg;
    private Api api;

    private Map<String, Object> stats;
    private Map<String, Object> heat;
    private Map<String, Object> track;
    private final Map<String, Map<String, Object>> liveHeats = new HashMap<>();

    private String view;
    private String range;
    private String pageKey;
    private String device = "";
    private boolean paused;
    private int countdown = 0;
    private boolean loading;
    private boolean pending;
    private boolean updatingCombo;
    private String lastError = "";

    private final Ui.Page content = new Ui.Page();
    private final JScrollPane scroller;
    private final JLabel status = Ui.label("cargando…", Font.PLAIN, 12, Ui.INK_2);
    private final JLabel footer = Ui.label("", Font.PLAIN, 12, Ui.MUTED);
    private final JComboBox<Item> pageBox = new JComboBox<>();
    private final JComboBox<Item> rangeBox = new JComboBox<>();
    private final Map<String, JButton> navButtons = new LinkedHashMap<>();
    private final JButton pauseBtn = Ui.button("Pausar", false);

    record Item(String key, String label) {
        @Override public String toString() { return label; }
    }

    MainFrame(Config cfg, String token) {
        super("Dwell en Tiempo Real · airmaggnature");
        this.cfg = cfg;
        this.api = new Api(cfg.url(), token);
        this.view = cfg.get("view", "mis");
        this.range = cfg.get("range", "24h");
        this.pageKey = cfg.get("page", "");

        setDefaultCloseOperation(EXIT_ON_CLOSE);
        try {
            setIconImage(ImageIO.read(MainFrame.class.getResource("icon.png")));
        } catch (Exception ignored) {
            // sin icono
        }
        setMinimumSize(new Dimension(1100, 720));
        setSize(1320, 860);
        setLocationRelativeTo(null);
        getContentPane().setBackground(Ui.PAGE);
        setLayout(new BorderLayout());

        add(buildSide(), BorderLayout.WEST);

        JPanel main = new JPanel(new BorderLayout());
        main.setBackground(Ui.PAGE);
        main.add(buildTop(), BorderLayout.NORTH);
        content.setLayout(new BoxLayout(content, BoxLayout.Y_AXIS));
        content.setBorder(BorderFactory.createEmptyBorder(4, 20, 20, 20));
        scroller = Ui.scroll(content);
        main.add(scroller, BorderLayout.CENTER);
        main.add(buildFooter(), BorderLayout.SOUTH);
        add(main, BorderLayout.CENTER);

        selectNav(view);
        new Timer(1000, e -> tick()).start();
        refresh();
    }

    // ------------------------------------------------------------ marco

    private JPanel buildSide() {
        JPanel side = new JPanel();
        side.setBackground(Ui.SIDE);
        side.setLayout(new BoxLayout(side, BoxLayout.Y_AXIS));
        side.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(0, 0, 0, 1, Ui.GRID), BorderFactory.createEmptyBorder(18, 12, 12, 12)));
        side.setPreferredSize(new Dimension(230, 100));
        JLabel brand = Ui.label("Dwell", Font.BOLD, 22, Ui.INK);
        brand.setAlignmentX(Component.LEFT_ALIGNMENT);
        side.add(brand);
        JLabel sub = Ui.label("airmaggnature", Font.PLAIN, 12, Ui.MUTED);
        sub.setAlignmentX(Component.LEFT_ALIGNMENT);
        side.add(sub);
        for (String[] n : NAV) {
            if (n[0].equals("#")) {
                side.add(Box.createVerticalStrut(16));
                JLabel g = Ui.label(n[1], Font.PLAIN, 11, Ui.MUTED);
                g.setBorder(BorderFactory.createEmptyBorder(0, 8, 4, 0));
                g.setAlignmentX(Component.LEFT_ALIGNMENT);
                side.add(g);
                continue;
            }
            JButton b = navButton(n[0], n[1]);
            navButtons.put(n[0], b);
            side.add(b);
        }
        side.add(Box.createVerticalGlue());
        return side;
    }

    private JButton navButton(String id, String text) {
        JButton b = new JButton(text) {
            @Override protected void paintComponent(Graphics g0) {
                Graphics2D g = (Graphics2D) g0.create();
                Ui.aa(g);
                boolean on = id.equals(view);
                if (on || getModel().isRollover()) {
                    g.setColor(on ? new Color(0x14243a) : new Color(0x181818));
                    g.fillRoundRect(0, 0, getWidth(), getHeight(), 8, 8);
                }
                if (on) {
                    g.setColor(Ui.SERIES);
                    g.fillRect(0, 4, 3, getHeight() - 8);
                }
                g.dispose();
                super.paintComponent(g0);
            }
        };
        b.setContentAreaFilled(false);
        b.setBorderPainted(false);
        b.setFocusPainted(false);
        b.setOpaque(false);
        b.setHorizontalAlignment(JButton.LEFT);
        b.setBorder(BorderFactory.createEmptyBorder(8, 12, 8, 8));
        b.setFont(new Font(Ui.SYMBOL_FAMILY, Font.PLAIN, 14));
        b.setText(Ui.safe(text, b.getFont()));
        b.setForeground(Ui.INK_2);
        b.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        b.setAlignmentX(Component.LEFT_ALIGNMENT);
        b.setMaximumSize(new Dimension(Integer.MAX_VALUE, 38));
        b.addActionListener(e -> go(id));
        return b;
    }

    private JPanel buildTop() {
        JPanel top = new JPanel(new BorderLayout());
        top.setBackground(Ui.PAGE);
        top.setBorder(BorderFactory.createEmptyBorder(14, 20, 10, 20));
        top.add(status, BorderLayout.WEST);
        JPanel filters = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        filters.setOpaque(false);
        for (String[] r : RANGES) rangeBox.addItem(new Item(r[0], r[1]));
        for (int i = 0; i < rangeBox.getItemCount(); i++) if (rangeBox.getItemAt(i).key().equals(range)) rangeBox.setSelectedIndex(i);
        pageBox.setPreferredSize(new Dimension(380, 30));
        rangeBox.setPreferredSize(new Dimension(160, 30));
        pageBox.addActionListener(e -> {
            if (updatingCombo) return;
            Item it = (Item) pageBox.getSelectedItem();
            pageKey = it == null ? "" : it.key();
            cfg.set("page", pageKey);
            heat = null;
            render();
            refresh();
        });
        rangeBox.addActionListener(e -> {
            Item it = (Item) rangeBox.getSelectedItem();
            range = it == null ? "24h" : it.key();
            cfg.set("range", range);
            refresh();
        });
        filters.add(pageBox);
        filters.add(rangeBox);
        top.add(filters, BorderLayout.EAST);
        return top;
    }

    private JPanel buildFooter() {
        JPanel f = new JPanel(new BorderLayout());
        f.setBackground(Ui.PAGE);
        f.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(1, 0, 0, 0, Ui.GRID), BorderFactory.createEmptyBorder(8, 20, 8, 20)));
        f.add(footer, BorderLayout.WEST);
        JPanel btns = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        btns.setOpaque(false);
        pauseBtn.addActionListener(e -> {
            paused = !paused;
            pauseBtn.setText(paused ? "Reanudar" : "Pausar");
            if (!paused) refresh();
            updateFooter();
        });
        JButton conf = Ui.button("Configurar", false);
        conf.addActionListener(e -> configure());
        JButton web = Ui.button("Abrir panel web", false);
        web.addActionListener(e -> browse(api.base()));
        JButton over = Ui.button("Ver mapa de calor en el navegador", true);
        over.addActionListener(e -> openOverlay(currentPage(), heat));
        btns.add(pauseBtn);
        btns.add(conf);
        btns.add(web);
        btns.add(over);
        f.add(btns, BorderLayout.EAST);
        return f;
    }

    private void tick() {
        if (paused || loading) return;
        if (--countdown <= 0) refresh();
        else updateFooter();
    }

    private void updateFooter() {
        String when = stats == null ? "" : "actualizado " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")) + " · ";
        footer.setText(lastError.isEmpty()
                ? (paused ? "pausado" : when + "refresca en " + Math.max(countdown, 0) + " s")
                : "⚠ " + lastError);
    }

    private void go(String id) {
        view = id;
        cfg.set("view", id);
        selectNav(id);
        scroller.getVerticalScrollBar().setValue(0);
        render();
        refresh();
    }

    private void selectNav(String id) {
        navButtons.forEach((k, b) -> {
            b.setForeground(k.equals(id) ? Ui.INK : Ui.INK_2);
            b.setFont(new Font(Ui.SYMBOL_FAMILY, k.equals(id) ? Font.BOLD : Font.PLAIN, 14));
            b.repaint();
        });
    }

    // ------------------------------------------------------------ datos

    private boolean needsHeat() { return view.equals("calor") || view.equals("clics") || view.equals("arreglar"); }

    void refresh() {
        if (loading) {
            pending = true; // al terminar la carga actual, se vuelve a pedir con la vista nueva
            return;
        }
        pending = false;
        loading = true;
        countdown = REFRESH_S;
        final String v = view, r = range;
        final Map<String, Object> page = currentPage();
        final String dev = device;
        new SwingWorker<Void, Void>() {
            Map<String, Object> s, h, t;
            final Map<String, Map<String, Object>> lh = new HashMap<>();
            Exception err;

            @Override protected Void doInBackground() {
                try {
                    s = api.get("/api/stats?range=" + r);
                    if (v.equals("calor") || v.equals("clics") || v.equals("arreglar")) {
                        String q = "/api/heatmap?range=" + r + "&device=" + dev;
                        if (page != null) q += "&host=" + Api.q(str(page.get("host"))) + "&path=" + Api.q(str(page.get("path")));
                        h = api.get(q);
                    }
                    if (v.equals("mis")) {
                        t = api.get("/api/landings?range=" + r);
                        for (Object o : Json.list(t.get("landings"))) {
                            Map<String, Object> l = obj(o);
                            lh.put(str(l.get("id")), api.get("/api/heatmap?range=" + r + "&host=" + Api.q(str(l.get("host")))
                                    + "&path=" + Api.q(str(l.get("path")))));
                        }
                    }
                } catch (Exception e) {
                    err = e;
                }
                return null;
            }

            @Override protected void done() {
                loading = false;
                if (pending) SwingUtilities.invokeLater(MainFrame.this::refresh);
                if (err instanceof Api.NotAuthorized) {
                    relogin();
                    return;
                }
                if (err != null) {
                    lastError = "Sin conexión con el panel: " + err.getMessage();
                    updateFooter();
                    return;
                }
                lastError = "";
                stats = s;
                if (h != null) heat = h;
                if (t != null) {
                    track = t;
                    liveHeats.clear();
                    liveHeats.putAll(lh);
                }
                fillPages();
                render();
                updateFooter();
            }
        }.execute();
    }

    private List<Map<String, Object>> landings() {
        List<Map<String, Object>> out = new ArrayList<>();
        if (stats != null) for (Object o : Json.list(stats.get("landings"))) out.add(obj(o));
        return out;
    }

    private Map<String, Object> currentPage() {
        for (Map<String, Object> l : landings()) if (str(l.get("key")).equals(pageKey)) return l;
        return null;
    }

    private void fillPages() {
        updatingCombo = true;
        pageBox.removeAllItems();
        pageBox.addItem(new Item("", "Todas las páginas"));
        int sel = 0;
        for (Map<String, Object> l : landings()) {
            pageBox.addItem(new Item(str(l.get("key")), str(l.get("path")) + "  (" + Ui.n(num(l.get("views"))) + ")"));
            if (str(l.get("key")).equals(pageKey)) sel = pageBox.getItemCount() - 1;
        }
        pageBox.setSelectedIndex(sel);
        updatingCombo = false;
        Map<String, Object> t = obj(stats == null ? null : stats.get("totals"));
        status.setText("<html><span style='color:#0ca30c'>●</span> <b>" + (paused ? "PAUSADO" : "EN VIVO") + "</b> · airmaggnature · "
                + Ui.n(num(t.get("live"))) + " visitantes ahora</html>");
    }

    private void pickPage(String key) {
        pageKey = key;
        cfg.set("page", key);
        fillPages();
        go("arreglar");
    }

    // ------------------------------------------------------------ vistas

    private void render() {
        int scroll = scroller.getVerticalScrollBar().getValue();
        content.removeAll();
        if (stats == null) {
            content.add(Widgets.text(lastError.isEmpty() ? "Cargando…" : lastError, 14, Ui.INK_2));
        } else if (!view.equals("mis") && landings().isEmpty()) {
            JPanel c = Widgets.section(content, "Aún no hay datos en este rango",
                    "Cuando entren visitas a airmaggnature aparecerán aquí. Prueba con un rango más largo (arriba a la derecha).");
            c.add(Box.createVerticalStrut(2));
        } else {
            switch (view) {
                case "mis": viewMis(); break;
                case "vivo": viewVivo(); break;
                case "visitantes": viewVisitantes(); break;
                case "caen": viewCaen(); break;
                case "calor": viewCalor(); break;
                case "clics": viewClics(); break;
                case "secciones": viewSecciones(); break;
                default: viewArreglar();
            }
        }
        content.add(Box.createVerticalGlue());
        content.revalidate();
        content.repaint();
        SwingUtilities.invokeLater(() -> scroller.getVerticalScrollBar().setValue(scroll));
    }

    private void viewMis() {
        JPanel head = Widgets.section(content, "Mis landings",
                "Las landings que sigues. Cada una se compara con " + RANGE_PREV.get(range)
                        + ", muestra sus visitas día por día y su mapa en vivo (en azul, lo que hacen ahora mismo).");
        JPanel row = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0));
        row.setOpaque(false);
        row.setAlignmentX(Component.LEFT_ALIGNMENT);
        JButton add = Ui.button("+ Guardar landing", true);
        add.addActionListener(e -> addLanding(null));
        row.add(add);
        head.add(row);
        if (track == null) {
            head.add(Widgets.text("Cargando…", 13, Ui.INK_2));
            return;
        }
        List<Object> list = Json.list(track.get("landings"));
        if (list.isEmpty()) head.add(Widgets.text("Aún no sigues ninguna landing. Pulsa “+ Guardar landing”.", 13, Ui.INK_2));
        for (Object o : list) landingCard(obj(o));

        List<Object> sug = Json.list(track.get("suggested"));
        if (!sug.isEmpty()) {
            JPanel c = Widgets.section(content, "Páginas con visitas que no sigues", "Si es una landing nueva, pulsa “+ Seguir”.");
            for (Object o : sug) {
                Map<String, Object> s = obj(o);
                JPanel r = new JPanel(new BorderLayout());
                r.setOpaque(false);
                r.setAlignmentX(Component.LEFT_ALIGNMENT);
                r.setMaximumSize(new Dimension(Integer.MAX_VALUE, 40));
                r.add(Ui.label(str(s.get("path")) + "   ·   " + Ui.n(num(s.get("views"))) + " visitas", Font.PLAIN, 13, Ui.INK), BorderLayout.CENTER);
                JButton follow = Ui.button("+ Seguir", false);
                follow.addActionListener(e -> saveLanding("https://" + str(s.get("host")) + str(s.get("path")), ""));
                r.add(follow, BorderLayout.EAST);
                c.add(r);
                c.add(Box.createVerticalStrut(6));
            }
        }
    }

    private Map<String, Object> statsFor(String path) {
        return landings().stream()
                .filter(l -> str(l.get("path")).equals(path) || (path.startsWith("/products/") && str(l.get("path")).endsWith(path)))
                .max(Comparator.comparingDouble(l -> num(l.get("views"))))
                .orElse(null);
    }

    private void landingCard(Map<String, Object> t) {
        Map<String, Object> cur = obj(t.get("current")), prev = obj(t.get("previous"));
        Map<String, Object> st = statsFor(str(t.get("path")));
        Map<String, Object> h = liveHeats.get(str(t.get("id")));

        JPanel card = Ui.card();
        card.setLayout(new BorderLayout(18, 0));
        card.setAlignmentX(Component.LEFT_ALIGNMENT);

        // ---- izquierda: nombre, metricas, dias
        JPanel left = new JPanel();
        left.setOpaque(false);
        left.setLayout(new BoxLayout(left, BoxLayout.Y_AXIS));
        JPanel title = new JPanel(new BorderLayout());
        title.setOpaque(false);
        title.setAlignmentX(Component.LEFT_ALIGNMENT);
        JPanel names = new JPanel();
        names.setOpaque(false);
        names.setLayout(new BoxLayout(names, BoxLayout.Y_AXIS));
        names.add(Ui.label(str(t.get("name")).isEmpty() ? str(t.get("path")) : str(t.get("name")), Font.BOLD, 17, Ui.INK));
        JLabel url = Ui.label(str(t.get("url")) + "  ↗", Font.PLAIN, 12, Ui.MUTED);
        url.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        url.addMouseListener(new java.awt.event.MouseAdapter() {
            @Override public void mouseClicked(java.awt.event.MouseEvent e) { browse(str(t.get("url"))); }
        });
        names.add(url);
        String last = t.get("lastVisit") == null ? "sin visitas todavía" : "última visita " + localTime(str(t.get("lastVisit")));
        names.add(Ui.label("Siguiendo desde " + str(t.get("created_at")).substring(0, 10) + " · " + last, Font.PLAIN, 12, Ui.MUTED));
        title.add(names, BorderLayout.CENTER);
        JPanel acts = new JPanel(new FlowLayout(FlowLayout.RIGHT, 6, 0));
        acts.setOpaque(false);
        JButton an = Ui.button("Analizar", true);
        an.setEnabled(st != null);
        an.addActionListener(e -> { if (st != null) pickPage(str(st.get("key"))); });
        JButton rm = Ui.button("Quitar", false);
        rm.addActionListener(e -> removeLanding(t));
        acts.add(an);
        acts.add(rm);
        title.add(acts, BorderLayout.EAST);
        title.setMaximumSize(new Dimension(Integer.MAX_VALUE, title.getPreferredSize().height));
        left.add(title);
        left.add(Box.createVerticalStrut(14));

        JPanel metrics = new JPanel(new GridLayout(2, 3, 12, 12));
        metrics.setOpaque(false);
        metrics.setAlignmentX(Component.LEFT_ALIGNMENT);
        metrics.add(metric("Visitas", Ui.n(num(cur.get("views"))), delta(num(cur.get("views")), num(prev.get("views")), false, false)));
        metrics.add(metric("Dwell mediano", Ui.time(num(cur.get("medianDwellMs"))),
                delta(num(cur.get("medianDwellMs")), num(prev.get("medianDwellMs")), false, false)));
        metrics.add(metric("Rebote", Ui.pct(num(cur.get("bounceRate"))), delta(num(cur.get("bounceRate")), num(prev.get("bounceRate")), true, true)));
        metrics.add(metric("Llegan a ver", Ui.pct(num(cur.get("avgSeen"))), delta(num(cur.get("avgSeen")), num(prev.get("avgSeen")), false, true)));
        metrics.add(metric("Agregan al carrito", Ui.pct(num(cur.get("cartRate"))), delta(num(cur.get("cartRate")), num(prev.get("cartRate")), false, true)));
        Map<String, Object> bn = st == null ? Map.of() : obj(st.get("bottleneck"));
        JPanel bnp = metric("Cuello de botella", bn.isEmpty() ? "—" : "⚠ " + (str(bn.get("label")).isEmpty() ? str(bn.get("id")) : str(bn.get("label"))), null);
        ((JLabel) bnp.getComponent(2)).setForeground(bn.isEmpty() ? Ui.INK : Ui.CRITICAL);
        ((JLabel) bnp.getComponent(2)).setFont(Ui.font(Font.BOLD, 14));
        metrics.add(bnp);
        metrics.setMaximumSize(new Dimension(Integer.MAX_VALUE, 130));
        left.add(metrics);
        left.add(Box.createVerticalStrut(14));
        JLabel dl = Ui.label("Visitas por día (14 días)", Font.PLAIN, 12, Ui.INK_2);
        dl.setAlignmentX(Component.LEFT_ALIGNMENT);
        left.add(dl);
        Widgets.MiniDays days = new Widgets.MiniDays(Json.list(t.get("daily")));
        days.setAlignmentX(Component.LEFT_ALIGNMENT);
        left.add(days);
        left.add(Box.createVerticalGlue());
        card.add(left, BorderLayout.CENTER);

        // ---- derecha: mapa en vivo + clics + mejora
        JPanel right = new JPanel() {
            @Override public Dimension getPreferredSize() {
                Dimension d = super.getPreferredSize();
                return new Dimension(316, d.height);
            }
        };
        right.setOpaque(false);
        right.setLayout(new BoxLayout(right, BoxLayout.Y_AXIS));
        right.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(0, 1, 0, 0, Ui.GRID), BorderFactory.createEmptyBorder(0, 16, 0, 0)));
        Map<String, Object> live = h == null ? Map.of() : obj(h.get("live"));
        int now = (int) num(live.get("visitors"));
        JLabel lv = Ui.label((now > 0 ? "● " : "○ ") + now + " ahora en la página", Font.BOLD, 13, now > 0 ? Ui.GOOD : Ui.INK_2);
        lv.setAlignmentX(Component.LEFT_ALIGNMENT);
        right.add(lv);
        right.add(Box.createVerticalStrut(6));
        Widgets.HeatPanel hp = new Widgets.HeatPanel(h, 280, 330, true);
        hp.setAlignmentX(Component.LEFT_ALIGNMENT);
        right.add(hp);
        right.add(Widgets.legend(true));
        if (h != null) {
            List<Object> dest = Json.list(h.get("destinations"));
            if (!dest.isEmpty()) {
                right.add(Box.createVerticalStrut(6));
                JLabel tl = Ui.label("Donde más hacen clic", Font.PLAIN, 12, Ui.INK_2);
                tl.setAlignmentX(Component.LEFT_ALIGNMENT);
                right.add(tl);
                for (int i = 0; i < Math.min(3, dest.size()); i++) {
                    Map<String, Object> d = obj(dest.get(i));
                    JLabel dlab = Ui.label((str(d.get("k")).equals("buy") ? "✓ " : "") + ellipsis(str(d.get("d")), 26) + "  ·  "
                            + Ui.n(num(d.get("count"))) + " · " + Math.round(num(d.get("avgY")) / 10) + "% alto", Font.PLAIN, 12, Ui.INK);
                    dlab.setAlignmentX(Component.LEFT_ALIGNMENT);
                    right.add(dlab);
                }
            }
            Map<String, Object> fix = mainIssue(st, h);
            if (fix != null) {
                right.add(Box.createVerticalStrut(8));
                JLabel fl = Ui.label("MEJORA PARA CONVERTIR MÁS", Font.BOLD, 11, Ui.INK_2);
                fl.setAlignmentX(Component.LEFT_ALIGNMENT);
                right.add(fl);
                right.add(Widgets.insight(fix));
            }
            if (h.get("overlayToken") != null) {
                right.add(Box.createVerticalStrut(8));
                JButton ov = Ui.button("Ver sobre la página ↗", true);
                ov.setAlignmentX(Component.LEFT_ALIGNMENT);
                ov.addActionListener(e -> openOverlay(t, h));
                right.add(ov);
            }
        }
        card.add(right, BorderLayout.EAST);
        content.add(card);
        content.add(Box.createVerticalStrut(14));
    }

    private static Map<String, Object> mainIssue(Map<String, Object> st, Map<String, Object> h) {
        List<Map<String, Object>> all = new ArrayList<>();
        if (st != null) for (Object o : Json.list(st.get("insights"))) all.add(obj(o));
        if (h != null) for (Object o : Json.list(h.get("insights"))) all.add(obj(o));
        return all.stream()
                .filter(i -> str(i.get("level")).equals("critical") || str(i.get("level")).equals("warning"))
                .min(Comparator.comparingInt(i -> Widgets.levelOrder(str(i.get("level")))))
                .orElse(null);
    }

    private static JPanel metric(String label, String value, JLabel delta) {
        JPanel p = new JPanel();
        p.setOpaque(false);
        p.setLayout(new BoxLayout(p, BoxLayout.Y_AXIS));
        p.add(Ui.label(label, Font.PLAIN, 12, Ui.INK_2));
        p.add(Box.createVerticalStrut(2));
        p.add(Ui.label(value, Font.BOLD, 20, Ui.INK));
        p.add(delta != null ? delta : Ui.label(" ", Font.PLAIN, 11, Ui.MUTED));
        return p;
    }

    private static JLabel delta(double cur, double prev, boolean lowerBetter, boolean points) {
        if (prev == 0 && cur == 0) return Ui.label("—", Font.PLAIN, 11, Ui.MUTED);
        if (prev == 0) return Ui.label("nuevo", Font.PLAIN, 11, Ui.MUTED);
        double d = cur - prev;
        if (Math.abs(d) < 0.05) return Ui.label("= igual", Font.PLAIN, 11, Ui.MUTED);
        boolean better = lowerBetter ? d < 0 : d > 0;
        String txt = points ? String.format(Ui.ES, "%+.1f pts", d) : String.format("%+d%%", Math.round(d / prev * 100));
        return Ui.label((d > 0 ? "▲ " : "▼ ") + txt, Font.PLAIN, 11, better ? Ui.GOOD : Ui.CRITICAL);
    }

    private void viewVivo() {
        Map<String, Object> t = obj(stats.get("totals"));
        content.add(Widgets.tiles(
                Widgets.tile("Visitas", Ui.n(num(t.get("views"))), Ui.n(num(t.get("sessions"))) + " sesiones"),
                Widgets.tile("Dwell mediano", Ui.time(num(t.get("medianDwellMs"))), "tiempo activo"),
                Widgets.tile("Rebote", Ui.pct(num(t.get("bounceRate"))), "menos de 10 s"),
                Widgets.tile("Scroll promedio", Ui.pct(num(t.get("avgScroll"))), null),
                Widgets.tile("Agregan al carrito", Ui.pct(num(t.get("cartRate"))), null),
                Widgets.tile("Van al checkout", Ui.pct(num(t.get("checkoutRate"))), null)));
        content.add(Box.createVerticalStrut(14));
        JPanel c = Widgets.section(content, "Landing pages", "Doble clic en una fila para analizarla.");
        List<Object[]> rows = new ArrayList<>();
        List<String> keys = new ArrayList<>();
        for (Map<String, Object> l : landings()) {
            Map<String, Object> bn = obj(l.get("bottleneck"));
            keys.add(str(l.get("key")));
            rows.add(new Object[]{str(l.get("path")), Ui.n(num(l.get("views"))), Ui.n(num(l.get("live"))), Ui.time(num(l.get("medianDwellMs"))),
                    Ui.pct(num(l.get("bounceRate"))), Ui.pct(num(l.get("avgScroll"))), Ui.pct(num(l.get("cartRate"))),
                    bn.isEmpty() ? "—" : "⚠ " + (str(bn.get("label")).isEmpty() ? str(bn.get("id")) : str(bn.get("label")))
                            + " (" + Ui.pct(num(bn.get("exitPct"))) + " se van)"});
        }
        JTable table = Ui.table(new Widgets.Rows(
                new String[]{"Página", "Visitas", "Ahora", "Dwell mediano", "Rebote", "Scroll", "Carrito", "Cuello de botella"},
                new Class<?>[]{String.class, Number.class, Number.class, Number.class, Number.class, Number.class, Number.class, String.class}, rows));
        table.getColumnModel().getColumn(0).setPreferredWidth(280);
        table.getColumnModel().getColumn(7).setPreferredWidth(260);
        table.addMouseListener(new java.awt.event.MouseAdapter() {
            @Override public void mouseClicked(java.awt.event.MouseEvent e) {
                int r = table.getSelectedRow();
                if (e.getClickCount() >= 2 && r >= 0) pickPage(keys.get(r));
            }
        });
        c.add(Widgets.tablePanel(table));
    }

    private void viewVisitantes() {
        Map<String, Object> page = currentPage();
        JPanel c = Widgets.section(content, "Visitantes ahora", "Personas con la página abierta en el último minuto. Se actualiza solo.");
        List<Object[]> rows = new ArrayList<>();
        for (Object o : Json.list(stats.get("visitors"))) {
            Map<String, Object> v = obj(o);
            if (page != null && !(str(v.get("host")) + str(v.get("path"))).equals(pageKey)) continue;
            rows.add(new Object[]{str(v.get("path")), str(v.get("device")).equals("movil") ? "Celular" : "Computadora",
                    Ui.time(num(v.get("dwellMs"))), Ui.pct(num(v.get("seen"))), str(v.get("section")).isEmpty() ? "—" : str(v.get("section")),
                    str(v.get("source")) + (str(v.get("campaign")).isEmpty() ? "" : " · " + str(v.get("campaign"))),
                    bool(v.get("checkout")) ? "✓ Checkout" : bool(v.get("cart")) ? "✓ Carrito" : "—"});
        }
        if (rows.isEmpty()) {
            c.add(Widgets.text("Nadie en este momento.", 13, Ui.INK_2));
            return;
        }
        c.add(Widgets.tablePanel(Ui.table(new Widgets.Rows(
                new String[]{"Página", "Dispositivo", "Lleva", "Llegó a ver", "Va por", "Viene de", "Compra"},
                new Class<?>[]{String.class, String.class, Number.class, Number.class, String.class, String.class, String.class}, rows))));
    }

    private void viewCaen() {
        Map<String, Object> page = currentPage();
        Map<String, Object> depth = obj(page != null ? page.get("depth") : stats.get("depth"));
        JPanel c = Widgets.section(content, "Dónde se caen" + (page != null ? " en " + str(page.get("path")) : ""),
                "Qué porcentaje de la gente llegó a ver cada altura de la página y cuánto tiempo pasó ahí. "
                        + "La caída más grande es la línea que hay que arreglar primero.");
        if (depth.isEmpty()) {
            c.add(Widgets.text("Aún no hay visitas con la medición por altura.", 13, Ui.INK_2));
            return;
        }
        c.add(new Widgets.DepthPanel(depth));
        c.add(Widgets.text("El " + Ui.pct(num(depth.get("noScrollPct"))) + " no hizo nada de scroll · la mitad de la gente llega hasta el "
                + (int) num(depth.get("halfAt")) + "% de la página. " + Ui.n(num(depth.get("views"))) + " visitas.", 12, Ui.MUTED));
    }

    private JPanel deviceFilter() {
        JPanel p = new JPanel(new FlowLayout(FlowLayout.LEFT, 6, 0));
        p.setOpaque(false);
        p.setAlignmentX(Component.LEFT_ALIGNMENT);
        String[][] opts = {{"", "Todos"}, {"movil", "Celular"}, {"escritorio", "Computadora"}};
        for (String[] o : opts) {
            JButton b = Ui.button(o[1], o[0].equals(device));
            b.addActionListener(e -> { device = o[0]; heat = null; render(); refresh(); });
            p.add(b);
        }
        p.setMaximumSize(new Dimension(Integer.MAX_VALUE, 40));
        return p;
    }

    private void viewCalor() {
        Map<String, Object> page = currentPage();
        JPanel c = Widgets.section(content, "Mapa de calor" + (page != null ? " de " + str(page.get("path")) : ""),
                "Por dónde pasó el cursor y dónde hicieron clic, sobre la página entera de arriba abajo. "
                        + "Verde = clic de compra; azul = lo que hacen ahora mismo.");
        c.add(deviceFilter());
        c.add(Box.createVerticalStrut(8));
        if (page == null) c.add(Widgets.text("⚠ Con “Todas las páginas” se mezclan páginas de distinto alto: elige una página arriba para que sea exacto.", 12.5f, Ui.WARNING));
        if (heat == null) {
            c.add(Widgets.text("Cargando…", 13, Ui.INK_2));
            return;
        }
        JPanel row = new JPanel(new BorderLayout(20, 0));
        row.setOpaque(false);
        row.setAlignmentX(Component.LEFT_ALIGNMENT);
        row.add(new Widgets.HeatPanel(heat, 520, 820, true), BorderLayout.WEST);
        JPanel side = new JPanel();
        side.setOpaque(false);
        side.setLayout(new BoxLayout(side, BoxLayout.Y_AXIS));
        side.add(Widgets.legend(true));
        side.add(Box.createVerticalStrut(8));
        side.add(Widgets.text(Ui.n(num(heat.get("views"))) + " visitas · " + Ui.n(num(heat.get("totalMoves"))) + " puntos de cursor · "
                + Ui.n(num(heat.get("totalClicks"))) + " clics · " + Ui.n(num(heat.get("buyClicks"))) + " de compra", 12.5f, Ui.INK_2));
        side.add(Box.createVerticalStrut(6));
        side.add(Widgets.text("El cursor solo se mide en computadora; en celular cuentan los toques (clics).", 12, Ui.MUTED));
        side.add(Box.createVerticalStrut(10));
        if (page != null && heat.get("overlayToken") != null) {
            JButton ov = Ui.button("Ver sobre mi tienda ↗", true);
            ov.setAlignmentX(Component.LEFT_ALIGNMENT);
            ov.addActionListener(e -> openOverlay(page, heat));
            side.add(ov);
        }
        side.add(Box.createVerticalGlue());
        row.add(side, BorderLayout.CENTER);
        c.add(row);
    }

    private void viewClics() {
        Map<String, Object> page = currentPage();
        JPanel c = Widgets.section(content, "Dónde hacen clic" + (page != null ? " en " + str(page.get("path")) : ""),
                "Cada destino de clic: a dónde lleva, cuántos lo tocaron y a qué altura de la página está.");
        c.add(deviceFilter());
        c.add(Box.createVerticalStrut(8));
        if (heat == null) {
            c.add(Widgets.text("Cargando…", 13, Ui.INK_2));
            return;
        }
        List<Object[]> rows = new ArrayList<>();
        for (Object o : Json.list(heat.get("destinations"))) {
            Map<String, Object> d = obj(o);
            rows.add(new Object[]{str(d.get("d")), KIND.getOrDefault(str(d.get("k")), str(d.get("k"))), Ui.n(num(d.get("count"))),
                    Ui.pct(num(d.get("visitorPct"))), Math.round(num(d.get("avgY")) / 10) + "%", (long) num(d.get("avgT")) + " s",
                    str(d.get("section")).isEmpty() ? "—" : str(d.get("section"))});
        }
        if (rows.isEmpty()) {
            c.add(Widgets.text("Aún no hay clics registrados en este rango.", 13, Ui.INK_2));
            return;
        }
        JTable t = Ui.table(new Widgets.Rows(new String[]{"Destino", "Tipo", "Clics", "Visitas que lo tocan", "Altura", "Segundo", "Sección"},
                new Class<?>[]{String.class, String.class, Number.class, Number.class, Number.class, Number.class, String.class}, rows));
        t.getColumnModel().getColumn(0).setPreferredWidth(300);
        c.add(Widgets.tablePanel(t));

        List<Object> bands = Json.list(heat.get("clickBands"));
        double total = Math.max(num(heat.get("totalClicks")), 1), max = 1;
        for (Object b : bands) max = Math.max(max, num(b));
        JPanel c2 = Widgets.section(content, "Clics por altura de la página", "Dónde tienes su dedo: qué parte de la página concentra los clics.");
        List<Object[]> br = new ArrayList<>();
        for (int i = 0; i < bands.size(); i++) {
            br.add(new Object[]{i * 10 + "–" + (i * 10 + 10) + "%", num(bands.get(i)), Ui.n(num(bands.get(i))), Ui.pct(num(bands.get(i)) / total * 100)});
        }
        JTable bt = Ui.table(new Widgets.Rows(new String[]{"Altura", "Clics", "", "% del total"},
                new Class<?>[]{String.class, Object.class, Number.class, Number.class}, br));
        bt.getColumnModel().getColumn(1).setCellRenderer(new Widgets.BarRenderer(max, Ui.SERIES));
        bt.getColumnModel().getColumn(1).setPreferredWidth(420);
        c2.add(Widgets.tablePanel(bt));
    }

    private void viewSecciones() {
        Map<String, Object> page = currentPage();
        if (page == null && !landings().isEmpty()) page = landings().get(0);
        List<Object> secs = Json.list(page.get("sections"));
        JPanel c = Widgets.section(content, "Secciones de " + str(page.get("path")),
                "“Se fueron aquí” = la última sección que vieron antes de irse; la más alta (sin contar el final) es el cuello de botella.");
        if (secs.isEmpty()) {
            c.add(Widgets.text("No se detectaron secciones en esta página.", 13, Ui.INK_2));
            return;
        }
        double maxMs = 1;
        for (Object o : secs) maxMs = Math.max(maxMs, num(obj(o).get("medianMs")));
        List<Object[]> rows = new ArrayList<>();
        int i = 1;
        for (Object o : secs) {
            Map<String, Object> s = obj(o);
            String name = str(s.get("label")).isEmpty() ? str(s.get("id")) : str(s.get("label"));
            rows.add(new Object[]{String.valueOf(i++), name, Ui.pct(num(s.get("reachPct"))), num(s.get("reachPct")),
                    Ui.time(num(s.get("medianMs"))), num(s.get("medianMs")), Ui.pct(num(s.get("exitPct"))),
                    bool(s.get("bottleneck")) ? "⚠ Cuello de botella" : "—"});
        }
        JTable t = Ui.table(new Widgets.Rows(new String[]{"#", "Sección", "La vieron", "Alcance", "Tiempo", "", "Se fueron aquí", "Estado"},
                new Class<?>[]{Number.class, String.class, Number.class, Object.class, Number.class, Object.class, Number.class, String.class}, rows));
        t.getColumnModel().getColumn(0).setPreferredWidth(30);
        t.getColumnModel().getColumn(3).setCellRenderer(new Widgets.BarRenderer(100, Ui.SERIES));
        t.getColumnModel().getColumn(5).setCellRenderer(new Widgets.BarRenderer(maxMs, Ui.WARM));
        c.add(Widgets.tablePanel(t));
    }

    private void viewArreglar() {
        Map<String, Object> page = currentPage();
        if (page == null) {
            JPanel c = Widgets.section(content, "Qué arreglar", "El problema principal de cada landing. Doble clic para ver el diagnóstico completo.");
            List<Object[]> rows = new ArrayList<>();
            List<String> keys = new ArrayList<>();
            for (Map<String, Object> l : landings()) {
                Map<String, Object> top = mainIssue(l, null);
                if (top == null) continue;
                keys.add(str(l.get("key")));
                rows.add(new Object[]{str(l.get("path")), Ui.n(num(l.get("views"))), (str(top.get("level")).equals("critical") ? "⛔ " : "⚠ ") + str(top.get("title"))});
            }
            if (rows.isEmpty()) {
                c.add(Widgets.text("Sin problemas claros todavía (o faltan visitas).", 13, Ui.INK_2));
                return;
            }
            JTable t = Ui.table(new Widgets.Rows(new String[]{"Página", "Visitas", "Problema principal"},
                    new Class<?>[]{String.class, Number.class, String.class}, rows));
            t.getColumnModel().getColumn(2).setPreferredWidth(520);
            t.addMouseListener(new java.awt.event.MouseAdapter() {
                @Override public void mouseClicked(java.awt.event.MouseEvent e) {
                    int r = t.getSelectedRow();
                    if (e.getClickCount() >= 2 && r >= 0) pickPage(keys.get(r));
                }
            });
            c.add(Widgets.tablePanel(t));
            return;
        }
        List<Map<String, Object>> items = new ArrayList<>();
        for (Object o : Json.list(page.get("insights"))) items.add(obj(o));
        if (heat != null) for (Object o : Json.list(heat.get("insights"))) items.add(obj(o));
        items.sort(Comparator.comparingInt(i -> Widgets.levelOrder(str(i.get("level")))));
        Map<String, Object> dev = obj(page.get("devices"));
        JPanel c = Widgets.section(content, "Qué arreglar en " + str(page.get("path")),
                "Dónde se atasca tu landing y qué cambiar, sacado de tus propios datos. " + Ui.n(num(page.get("views"))) + " visitas ("
                        + Ui.n(num(obj(dev.get("movil")).get("views"))) + " celular · " + Ui.n(num(obj(dev.get("escritorio")).get("views"))) + " computadora).");
        Map<String, Object> main = mainIssue(page, heat);
        if (main != null) {
            JLabel e = Ui.label("EL CUELLO DE BOTELLA", Font.BOLD, 11, Ui.MUTED);
            e.setAlignmentX(Component.LEFT_ALIGNMENT);
            c.add(e);
            JComponent h = Widgets.text(str(main.get("title")), 20, Ui.INK);
            h.setFont(Ui.font(Font.BOLD, 20));
            c.add(h);
            c.add(Box.createVerticalStrut(12));
        }
        for (Map<String, Object> it : items) {
            c.add(Widgets.insight(it));
            c.add(Box.createVerticalStrut(10));
        }
    }

    // ------------------------------------------------------------ acciones

    private void addLanding(String preset) {
        JTextField url = new JTextField(preset == null ? "https://airmaggnature.myshopify.com/products/" : preset, 40);
        JTextField name = new JTextField(20);
        JPanel p = form(new String[]{"Dirección de la landing", "Nombre (opcional)"}, new JComponent[]{url, name});
        if (JOptionPane.showConfirmDialog(this, p, "Guardar landing", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE) == JOptionPane.OK_OPTION) {
            saveLanding(url.getText(), name.getText());
        }
    }

    private void saveLanding(String url, String name) {
        new SwingWorker<Void, Void>() {
            Exception err;
            @Override protected Void doInBackground() {
                try {
                    api.send("POST", "/api/landings", "{\"url\":" + Api.jsonString(url) + ",\"name\":" + Api.jsonString(name) + "}");
                } catch (Exception e) { err = e; }
                return null;
            }
            @Override protected void done() {
                if (err != null) JOptionPane.showMessageDialog(MainFrame.this, err.getMessage(), "No se pudo guardar", JOptionPane.WARNING_MESSAGE);
                refresh();
            }
        }.execute();
    }

    private void removeLanding(Map<String, Object> t) {
        String n = str(t.get("name")).isEmpty() ? str(t.get("path")) : str(t.get("name"));
        if (JOptionPane.showConfirmDialog(this, "¿Dejar de seguir " + n + "?\nLas visitas ya guardadas no se borran.", "Quitar landing",
                JOptionPane.OK_CANCEL_OPTION) != JOptionPane.OK_OPTION) return;
        new SwingWorker<Void, Void>() {
            @Override protected Void doInBackground() {
                try { api.send("DELETE", "/api/landings?id=" + Api.q(str(t.get("id"))), null); } catch (Exception ignored) { /* se ve al refrescar */ }
                return null;
            }
            @Override protected void done() { refresh(); }
        }.execute();
    }

    private void openOverlay(Map<String, Object> page, Map<String, Object> h) {
        if (page == null || h == null || h.get("overlayToken") == null) {
            JOptionPane.showMessageDialog(this, "Elige una página arriba (o una landing en “Mis landings”) para verla sobre tu tienda.",
                    "Mapa de calor", JOptionPane.INFORMATION_MESSAGE);
            return;
        }
        browse("https://" + str(page.get("host")) + str(page.get("path")) + "?dwell_overlay=" + Api.q(str(h.get("overlayToken"))));
    }

    private void browse(String url) {
        try {
            Desktop.getDesktop().browse(URI.create(url));
        } catch (Exception e) {
            JOptionPane.showMessageDialog(this, "Abre esta dirección en tu navegador:\n" + url, "Dwell", JOptionPane.INFORMATION_MESSAGE);
        }
    }

    private void configure() {
        String token = askLogin(this, cfg, "Cambia la dirección del panel o vuelve a entrar con tu contraseña.");
        if (token != null) {
            api = new Api(cfg.url(), token);
            refresh();
        }
    }

    private void relogin() {
        String token = askLogin(this, cfg, "Tu sesión venció. Escribe la contraseña del panel.");
        if (token == null) System.exit(0);
        api = new Api(cfg.url(), token);
        refresh();
    }

    // ------------------------------------------------------------ inicio de sesion

    static String askLogin(Component parent, Config cfg, String message) {
        JTextField url = new JTextField(cfg.url(), 30);
        JPasswordField pass = new JPasswordField(20);
        JPanel p = form(new String[]{"Dirección del panel", "Contraseña del panel"}, new JComponent[]{url, pass});
        JPanel wrap = new JPanel(new BorderLayout(0, 10));
        wrap.add(Ui.label(message, Font.PLAIN, 13, Ui.INK), BorderLayout.NORTH);
        wrap.add(p, BorderLayout.CENTER);
        while (true) {
            SwingUtilities.invokeLater(pass::requestFocusInWindow);
            int ok = JOptionPane.showConfirmDialog(parent, wrap, "Dwell · airmaggnature", JOptionPane.OK_CANCEL_OPTION, JOptionPane.PLAIN_MESSAGE);
            if (ok != JOptionPane.OK_OPTION) return null;
            try {
                String token = Api.login(url.getText().trim(), new String(pass.getPassword()));
                cfg.set("url", url.getText().trim().replaceAll("/+$", ""));
                cfg.set("token", token);
                return token;
            } catch (Api.NotAuthorized e) {
                JOptionPane.showMessageDialog(parent, "Contraseña incorrecta.", "Dwell", JOptionPane.WARNING_MESSAGE);
            } catch (Exception e) {
                JOptionPane.showMessageDialog(parent, "No se pudo conectar con " + url.getText() + "\n" + e.getMessage(), "Dwell", JOptionPane.WARNING_MESSAGE);
            }
        }
    }

    private static JPanel form(String[] labels, JComponent[] fields) {
        JPanel p = new JPanel(new GridBagLayout());
        GridBagConstraints c = new GridBagConstraints();
        c.insets = new Insets(4, 0, 4, 10);
        c.anchor = GridBagConstraints.WEST;
        for (int i = 0; i < labels.length; i++) {
            c.gridx = 0;
            c.gridy = i;
            c.fill = GridBagConstraints.NONE;
            p.add(Ui.label(labels[i], Font.PLAIN, 13, Ui.INK), c);
            c.gridx = 1;
            c.fill = GridBagConstraints.HORIZONTAL;
            c.weightx = 1;
            fields[i].setPreferredSize(new Dimension(360, 30));
            p.add(fields[i], c);
        }
        return p;
    }

    private static String localTime(String iso) {
        try {
            return OffsetDateTime.parse(iso.replace(" ", "T").replaceAll("\\+00$", "+00:00"))
                    .atZoneSameInstant(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("dd/MM HH:mm"));
        } catch (Exception e) {
            return iso;
        }
    }

    private static String ellipsis(String s, int n) { return s.length() <= n ? s : s.substring(0, n - 1) + "…"; }

    // ------------------------------------------------------------ capturas (solo para pruebas)

    void snapshots(File dir) {
        new Thread(() -> {
            try {
                for (String v : new String[]{"mis", "vivo", "visitantes", "caen", "calor", "clics", "secciones", "arreglar"}) {
                    SwingUtilities.invokeAndWait(() -> {
                        if (!v.equals("mis") && pageKey.isEmpty() && !landings().isEmpty()) {
                            pageKey = str(landings().get(0).get("key"));
                            fillPages();
                        }
                        go(v);
                    });
                    for (int i = 0; i < 100 && (loading || (needsHeat() && heat == null)); i++) Thread.sleep(100);
                    Thread.sleep(1200);
                    SwingUtilities.invokeAndWait(() -> {
                        BufferedImage img = new BufferedImage(getContentPane().getWidth(), getContentPane().getHeight(), BufferedImage.TYPE_INT_RGB);
                        Graphics2D g = img.createGraphics();
                        getContentPane().paint(g);
                        g.dispose();
                        try { ImageIO.write(img, "png", new File(dir, "java-" + v + ".png")); } catch (Exception ignored) { /* prueba */ }
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            System.exit(0);
        }).start();
    }
}
