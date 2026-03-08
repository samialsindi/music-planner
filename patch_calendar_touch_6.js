const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { useLongPress }')) {
  content = content.replace(/import \{ supabase \} from '@\/lib\/supabase';/, "import { supabase } from '@/lib/supabase';\nimport { useLongPress } from '@/hooks/useLongPress';");
}

fs.writeFileSync(filePath, content);
