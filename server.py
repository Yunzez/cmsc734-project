import http.server
import socketserver

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.endswith(".js"):
            self.send_header("Content-Type", "application/javascript")
        super().end_headers()

PORT = 8088
handler = MyHTTPRequestHandler
httpd = socketserver.TCPServer(("", PORT), handler)

print(f"Serving at http://localhost:{PORT}")
httpd.serve_forever()
