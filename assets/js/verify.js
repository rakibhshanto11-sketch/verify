// verify.js - fetches published Google Sheet CSV and searches by student ID
const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vREXkkmBCuLVpmXryeWCzuJqczkwhq3CmXpXi9PUg2I3pcKFO6cWJDJywM9MJzdTYoB6veKXjElz-gT/pub?output=csv";

const form = document.getElementById('verifyForm');
const input = document.getElementById('studentID');
const resultDiv = document.getElementById('result');

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]; }); }

// Basic CSV parser that handles quoted fields with commas
function parseCSV(text){
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for(let i=0;i<text.length;i++){
    const ch = text[i];
    if(ch === '"'){
      // toggle quote state if not escaped
      inQuotes = !inQuotes;
      continue;
    }
    if(ch === ',' && !inQuotes){
      row.push(cur);
      cur = '';
      continue;
    }
    if((ch === '\n' || ch === '\r') && !inQuotes){
      if(cur !== '' || row.length){ row.push(cur); rows.push(row); row = []; cur = ''; }
      // handle CRLF
      if(ch === '\r' && text[i+1] === '\n'){ i++; }
      continue;
    }
    cur += ch;
  }
  if(cur !== '' || row.length){ row.push(cur); rows.push(row); }
  return rows.map(r => r.map(c => c.trim()));
}

async function fetchCSV(url){
  const res = await fetch(url, {cache: 'no-store'});
  if(!res.ok) throw new Error('Network error');
  const text = await res.text();
  return parseCSV(text);
}

function showInfo(type, html){
  resultDiv.className = 'result ' + (type==='success' ? 'success' : 'error');
  resultDiv.innerHTML = html;
  resultDiv.hidden = false;
}

// handle submit
form.addEventListener('submit', async function(e){
  e.preventDefault();
  const id = (input.value || '').trim().toUpperCase();
  if(!id){ showInfo('error', 'Please enter a Registration / Roll Number.'); return; }
  showInfo('info', 'Searching...');

  try{
    const rows = await fetchCSV(sheetCsvUrl);
    if(!rows || rows.length < 2){ showInfo('error','No data found in sheet.'); return; }
    const header = rows[0].map(h => (h||'').toLowerCase());
    const rowsData = rows.slice(1);

    // assume ID in col 0, Name col1, Degree col2, Concentration col3, Year col4 (best-effort)
    let found = null;
    for(const r of rowsData){
      const reg = (r[0]||'').trim().toUpperCase();
      if(reg === id){
        found = r;
        break;
      }
    }

    if(found){
      const name = escapeHtml(found[1]||'N/A');
      const degree = escapeHtml(found[2]||'N/A');
      const concentration = escapeHtml(found[3]||'N/A');
      const year = escapeHtml(found[4]||'N/A');
      const html = `✅ <strong>Degree Verified</strong><br><br>
        <strong>Name:</strong> ${name}<br>
        <strong>Degree:</strong> ${degree}<br>
        <strong>Concentration:</strong> ${concentration}<br>
        <strong>Graduation Year:</strong> ${year}`;
      showInfo('success', html);
    } else {
      showInfo('error', '❌ No record found for ID: ' + escapeHtml(id));
    }
  } catch(err){
    console.error(err);
    showInfo('error', '⚠️ Error fetching verification data. If this persists, consider using a server-side proxy to load the CSV.');
  }
});
