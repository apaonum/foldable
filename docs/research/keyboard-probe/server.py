import http.server, sys
LOG = sys.argv[1]
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers['Content-Length']))
        with open(LOG, 'ab') as f: f.write(body + b'\n')
        self.send_response(204); self.end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('0.0.0.0', 8765), H).serve_forever()
