package airmagg.dwell;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Lector JSON minimo (sin dependencias). Devuelve Map, List, Double, String, Boolean o null. */
final class Json {
    private final String s;
    private int i;

    private Json(String s) { this.s = s; }

    static Object parse(String text) {
        Json j = new Json(text);
        j.ws();
        Object v = j.value();
        j.ws();
        if (j.i != j.s.length()) throw new IllegalArgumentException("JSON con texto de sobra en " + j.i);
        return v;
    }

    private void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }

    private Object value() {
        ws();
        if (i >= s.length()) throw new IllegalArgumentException("JSON incompleto");
        char c = s.charAt(i);
        switch (c) {
            case '{': return object();
            case '[': return array();
            case '"': return string();
            case 't': expect("true"); return Boolean.TRUE;
            case 'f': expect("false"); return Boolean.FALSE;
            case 'n': expect("null"); return null;
            default: return number();
        }
    }

    private void expect(String word) {
        if (!s.startsWith(word, i)) throw new IllegalArgumentException("Se esperaba " + word + " en " + i);
        i += word.length();
    }

    private Map<String, Object> object() {
        Map<String, Object> m = new LinkedHashMap<>();
        i++;
        ws();
        if (s.charAt(i) == '}') { i++; return m; }
        while (true) {
            ws();
            String k = string();
            ws();
            if (s.charAt(i++) != ':') throw new IllegalArgumentException("Se esperaba ':' en " + i);
            m.put(k, value());
            ws();
            char c = s.charAt(i++);
            if (c == '}') return m;
            if (c != ',') throw new IllegalArgumentException("Se esperaba ',' en " + i);
        }
    }

    private List<Object> array() {
        List<Object> l = new ArrayList<>();
        i++;
        ws();
        if (s.charAt(i) == ']') { i++; return l; }
        while (true) {
            l.add(value());
            ws();
            char c = s.charAt(i++);
            if (c == ']') return l;
            if (c != ',') throw new IllegalArgumentException("Se esperaba ',' en " + i);
        }
    }

    private String string() {
        if (s.charAt(i) != '"') throw new IllegalArgumentException("Se esperaba texto en " + i);
        i++;
        StringBuilder b = new StringBuilder();
        while (true) {
            char c = s.charAt(i++);
            if (c == '"') return b.toString();
            if (c != '\\') { b.append(c); continue; }
            char e = s.charAt(i++);
            switch (e) {
                case 'n': b.append('\n'); break;
                case 't': b.append('\t'); break;
                case 'r': b.append('\r'); break;
                case 'b': b.append('\b'); break;
                case 'f': b.append('\f'); break;
                case 'u': b.append((char) Integer.parseInt(s.substring(i, i + 4), 16)); i += 4; break;
                default: b.append(e);
            }
        }
    }

    private Double number() {
        int start = i;
        while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
        return Double.valueOf(s.substring(start, i));
    }

    // ---- ayudas para leer sin castear en todos lados ----
    @SuppressWarnings("unchecked")
    static Map<String, Object> obj(Object o) { return o instanceof Map ? (Map<String, Object>) o : Map.of(); }

    @SuppressWarnings("unchecked")
    static List<Object> list(Object o) { return o instanceof List ? (List<Object>) o : List.of(); }

    static double num(Object o) { return o instanceof Number ? ((Number) o).doubleValue() : 0; }

    static String str(Object o) { return o == null ? "" : String.valueOf(o); }

    static boolean bool(Object o) { return Boolean.TRUE.equals(o); }
}
