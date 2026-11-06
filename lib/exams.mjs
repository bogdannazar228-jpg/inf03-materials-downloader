/** @typedef {{id:string,title:string,source_page_url:string,public_url:string,year:number,session:string|null,file_type:string,file_size_bytes:number}} Item */
/** @typedef {{key:string,source_page_url:string,year:number,session:string|null,files:Item[]}} Exam */
const sessions = { 'styczeń': 1, 'czerwiec': 6, 'sierpień': 8 };
/** @param {Item[]} items @returns {Exam[]} */
export function groupExams(items) {
  /** @type {Map<string,Exam>} */
  const groups = new Map();
  for (const item of items) {
    // A source page identifies an exam; do not combine unrelated pages from one session.
    const page = item.source_page_url || `unknown:${item.id}`;
    const key = JSON.stringify([page, item.year, item.session]);
    if (!groups.has(key)) groups.set(key,{key,source_page_url:item.source_page_url,year:item.year,session:item.session,files:[]});
    groups.get(key).files.push(item);
  }
  return [...groups.values()].sort((a,b) => b.year-a.year || (sessions[b.session ?? ''] || 0)-(sessions[a.session ?? ''] || 0));
}
/** @param {Exam[]} exams @param {string} year @param {string} type @returns {Exam[]} */
export function filterExams(exams, year, type) {
  return exams.filter(exam => (!year || String(exam.year) === year) && (!type || exam.files.some(file => file.file_type === type)));
}
