// Curated against the task PDF and, where available, the ZIP contents.
// Exact source-page keys prevent silently applying a topic to a different exam.
const notes = {
 '2026-czerwiec': {title:'Туристический портал об Исландии', code:'INF.03-01-26.06-SG', detail:'Водопады и достопримечательности Исландии: сайт, SQL-запросы и PHP.', archive:'baza1.sql и фотографии достопримечательностей.'},
 '2026-styczen': {title:'Портал автомобилей', code:'INF.03-01-26.01-SG', detail:'Автомобили, цвета и цены: таблицы, SQL-запросы и PHP.', archive:'baza.sql и изображения a1.jpg, a2.jpg, a3.png.'},
 '2025-czerwiec': {title:'Рейтинг компьютерных игр', code:'INF.03-01-25.06-SG', detail:'Рейтинг игр, поиск и добавление записей: SQL и PHP.', archive:'baza.sql, изображения игр и rekord.txt.'},
 '2025-styczen': {title:'Курсы программирования и рассрочка', code:'INF.03-01-25.01-SG', detail:'Сайт компьютерных курсов и расчёт рассрочки на JavaScript; отдельно SQL-запросы.'},
 '2024-czerwiec': {title:'Мотоциклы и поездки', code:'INF.03-01-24.06-SG', detail:'Сайт о мотоциклах и маршрутах: база данных, SQL и PHP.'},
 '2024-styczen': {title:'Сайт IT-услуг', code:'INF.03-01-24.01-SG', detail:'Сайт фирмы IT-услуг: логотип, баннеры и форма со скриптом.', archive:'grafika.jpg для подготовки баннеров.'},
 '2023-czerwiec': {title:'Магазин для школьников', code:'INF.03-01-23.06-SG', detail:'Товары и акции магазина: SQL-запросы и PHP-скрипты.', archive:'sklep.sql и изображение promocja.png.'},
 '2023-styczen': {title:'Краски и расчёт количества банок', code:'INF.03-01-23.01-SG', detail:'Портал о красках: SQL-запросы и расчёт количества краски в браузере.', archive:'malarz.sql и obraz.png.'},
 '2022-czerwiec': {title:'Портал для рыболовов', code:'INF.03-01-22.06-SG', detail:'Рыбы и водоёмы: база данных, SQL-запросы и PHP.', archive:'baza.sql и ryba1.jpg.'},
 '2022-styczen': {title:'Ресторан «Wszystkie Smaki»', code:'INF.03-01-22.01-SG', detail:'Меню и бронирование столиков: SQL-запросы и PHP.', archive:'baza.sql и menu.jpg.', note:'Очень похоже на задание за июнь 2021: ресторан и бронирование.'},
 '2021-czerwiec': {title:'Ресторан «Wszystkie Smaki»', code:'INF.03-01-21.06-SG', detail:'Меню и бронирование столиков: SQL-запросы и PHP.', archive:'baza.sql и menu.jpg.', note:'Очень похоже на задание за январь 2022: ресторан и бронирование.'},
};
/** @param {string} sourcePageUrl */
export function examNotes(sourcePageUrl) {
 const prefix='https://arkusze.pl/egzamin-zawodowy-inf-03-';
 if (!sourcePageUrl.startsWith(prefix) || !sourcePageUrl.endsWith('/')) return null;
 const key=sourcePageUrl.slice(prefix.length,-1);
 return Object.prototype.hasOwnProperty.call(notes,key) ? notes[key] : null;
}
