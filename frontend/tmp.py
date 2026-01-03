from pathlib import Path
import re
path = Path('frontend/src/app/explore/page.tsx')
data = path.read_text()
clean = re.sub(r'\s*dark:[^\s"<>]+', '', data)
path.write_text(clean)
