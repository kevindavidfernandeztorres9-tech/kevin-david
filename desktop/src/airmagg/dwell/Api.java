package airmagg.dwell;

import java.io.IOException;
import java.net.ProxySelector;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/** Habla con el panel en Vercel usando la misma cookie que el navegador. */
final class Api {
    static final String COOKIE = "dwell_auth";

    static final class NotAuthorized extends IOException {
        private static final long serialVersionUID = 1L;
        NotAuthorized() { super("Contraseña incorrecta o sesión vencida"); }
    }

    private final HttpClient http;
    private final String base;
    private final String token;

    Api(String base, String token) {
        this.base = base.replaceAll("/+$", "");
        this.token = token;
        this.http = HttpClient.newBuilder()
                // En http:// (pruebas locales) no intentar el salto a HTTP/2
                .version(this.base.startsWith("https://") ? HttpClient.Version.HTTP_2 : HttpClient.Version.HTTP_1_1)
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(10))
                .proxy(ProxySelector.getDefault())
                .build();
    }

    /** Devuelve el valor de la cookie de sesion, o lanza NotAuthorized. */
    static String login(String base, String password) throws IOException, InterruptedException {
        Api api = new Api(base, "");
        String form = "password=" + URLEncoder.encode(password, StandardCharsets.UTF_8);
        HttpRequest req = HttpRequest.newBuilder(URI.create(api.base + "/api/login"))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();
        HttpResponse<String> res = api.http.send(req, HttpResponse.BodyHandlers.ofString());
        for (String c : res.headers().allValues("set-cookie")) {
            if (c.startsWith(COOKIE + "=")) {
                String v = c.substring(COOKIE.length() + 1);
                int semi = v.indexOf(';');
                return semi >= 0 ? v.substring(0, semi) : v;
            }
        }
        if (res.statusCode() == 303 || res.statusCode() == 302) throw new NotAuthorized();
        throw new IOException("El panel respondió " + res.statusCode() + ". Revisa la dirección.");
    }

    Map<String, Object> get(String pathAndQuery) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder(URI.create(base + pathAndQuery))
                .timeout(Duration.ofSeconds(30))
                .header("Cookie", COOKIE + "=" + token)
                .GET()
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (res.statusCode() == 401 || res.statusCode() == 307 || res.statusCode() == 302) throw new NotAuthorized();
        Map<String, Object> body;
        try {
            body = Json.obj(Json.parse(res.body()));
        } catch (RuntimeException e) {
            throw new IOException("Respuesta inesperada del panel (" + res.statusCode() + ")");
        }
        if (res.statusCode() >= 400) throw new IOException(Json.str(body.getOrDefault("error", "Error " + res.statusCode())));
        return body;
    }

    Map<String, Object> send(String method, String pathAndQuery, String json) throws IOException, InterruptedException {
        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create(base + pathAndQuery))
                .timeout(Duration.ofSeconds(30))
                .header("Cookie", COOKIE + "=" + token)
                .header("Content-Type", "application/json");
        HttpRequest req = json == null ? rb.method(method, HttpRequest.BodyPublishers.noBody()).build()
                : rb.method(method, HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8)).build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (res.statusCode() == 401) throw new NotAuthorized();
        Map<String, Object> body = Map.of();
        if (!res.body().isBlank()) {
            try { body = Json.obj(Json.parse(res.body())); } catch (RuntimeException ignored) { /* sin cuerpo */ }
        }
        if (res.statusCode() >= 400) throw new IOException(Json.str(body.getOrDefault("error", "Error " + res.statusCode())));
        return body;
    }

    static String jsonString(String v) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : v.toCharArray()) {
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }

    static String q(String v) { return URLEncoder.encode(v == null ? "" : v, StandardCharsets.UTF_8); }

    String base() { return base; }
}
