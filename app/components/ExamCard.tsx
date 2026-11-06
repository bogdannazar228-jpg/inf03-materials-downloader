'use client';

import { useEffect, useState } from 'react';
import { downloadUrl } from '../../lib/download.mjs';
import { readProgress, writeProgress } from '../../lib/progress.mjs';

type Item = {id:string;title:string;source_page_url:string;public_url:string;year:number;session:string|null;file_type:string;file_size_bytes:number};
type Exam = {key:string;source_page_url:string;year:number;session:string|null;files:Item[]};
type Notes = {title:string;code:string;detail:string;archive?:string;note?:string} | null;
type Status = 'loading' | 'done' | 'unmarked' | 'unavailable';
const labels:Record<string,string> = {arkusz:'Задание (аркуш)',klucz:'Правила оценивания',materialy_pomocnicze:'Приложения'};
const descriptions:Record<string,string> = {arkusz:'Условие и задания экзамена',klucz:'Ответы и критерии оценки',materialy_pomocnicze:'Файлы для выполнения задания'};
function size(n:number){return n>=1048576?`${(n/1048576).toFixed(1)} МБ`:`${Math.ceil(n/1024)} КБ`}

export function ExamCard({exam,index,notes}:{exam:Exam;index:number;notes:Notes}) {
  const [status,setStatus]=useState<Status>('loading');
  useEffect(()=>{
    function refresh(){try{setStatus(readProgress(window.localStorage,exam.key))}catch{setStatus('unavailable')}}
    refresh(); window.addEventListener('storage',refresh); return ()=>window.removeEventListener('storage',refresh);
  },[exam.key]);
  function toggle(){
    try {
      const next=status!=='done';
      if(writeProgress(window.localStorage,exam.key,next)) setStatus(next?'done':'unmarked');
      else setStatus('unavailable');
    } catch {setStatus('unavailable')}
  }
  return <article className="exam-card"><details><summary className="exam-summary">
    <div className="file-icon" aria-hidden="true">INF</div>
    <div className="exam-summary-text">
      <div className="file-top"><span className="index">{String(index+1).padStart(2,'0')} / INF.03</span><span className={`progress-badge ${status==='done'?'is-done':''}`}>{status==='done'?'✓ СДЕЛАНО':status==='unmarked'?'НЕ ОТМЕЧЕНО':status==='unavailable'?'ПРОГРЕСС НЕДОСТУПЕН':'ЗАГРУЗКА СТАТУСА'}</span></div>
      <h3>{notes?.title ?? 'Экзамен INF.03 — тема пока не описана'}</h3>
      <p>{exam.year} · {exam.session||'сессия не указана'} {notes?.code&&<><span> / </span>{notes.code}</>}</p>
      {notes&&<p className="exam-teaser">{notes.detail}</p>}
    </div>
    <span className="open-label"><span className="open-text">ОТКРЫТЬ</span><span className="close-text">ЗАКРЫТЬ</span><span className="chevron" aria-hidden="true">↓</span></span>
  </summary><div className="exam-content">
    <div className="progress-panel"><div><strong>Мой прогресс</strong><p>Отметка хранится только в этом браузере на этом устройстве.</p></div><button type="button" className={`progress-button ${status==='done'?'is-done':''}`} aria-pressed={status==='done'} disabled={status==='loading'||status==='unavailable'} onClick={toggle}>{status==='done'?'✓ Сделано — отменить':'Отметить как сделанное'}</button>{status==='unavailable'&&<p role="alert" className="progress-error">Браузер не позволяет сохранить отметку. Проверьте настройки хранения данных.</p>}</div>
    {notes?.note&&<p className="exam-note">ⓘ {notes.note}</p>}
    <div className="exam-content-heading"><div><span className="tag">// МАТЕРИАЛЫ ЭКЗАМЕНА</span><h4>Выберите, что скачать</h4></div><a className="source" href={exam.source_page_url} target="_blank" rel="noopener noreferrer">Источник ↗</a></div>
    <div className="download-list">{Object.entries(labels).map(([type,label])=>{const files=exam.files.filter(x=>x.file_type===type);return <div className="download-row" key={type}><div className="download-info"><strong>{label}</strong><span>{type==='materialy_pomocnicze'&&notes?.archive?`В архиве: ${notes.archive}`:descriptions[type]}</span></div><div className="download-options">{files.length?files.map(file=><div className="download-option" key={file.id}>{files.length>1&&<span className="variant-name">{file.title}</span>}<span className="file-size">{size(file.file_size_bytes)}</span><a className="download" href={downloadUrl(file.public_url,file.title)} aria-label={`Скачать: ${file.title}`}>Скачать ↓</a></div>):<span className="unavailable">Нет в каталоге</span>}</div></div>})}</div>
  </div></details></article>;
}
