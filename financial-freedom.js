/* INJ Node Financial Freedom v1. Read-only from parent wallet/market source.
   No private keys, blockchain writes, or imagined live values. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const STORE='inj_node_freedom_preferences_v1';
 const tiers=[
  {min:0,it:'BASE',en:'START',label:'< 10K'},
  {min:10000,it:'RISERVA',en:'RESERVE',label:'10K+'},
  {min:50000,it:'CRESCITA',en:'GROWTH',label:'50K+'},
  {min:250000,it:'CAPITALE',en:'CAPITAL',label:'250K+'},
  {min:1000000,it:'PATRIMONIO',en:'WEALTH',label:'1M+'},
  {min:3000000,it:'LEGACY',en:'LEGACY',label:'3M+'}
 ];
 const SPEND_STORE='inj_node_freedom_spending_v1';
 const spendCategories=[{"id":"food","it":"ALIMENTAZIONE","en":"FOOD & GROCERIES"},{"id":"housing","it":"CASA E UTENZE","en":"HOME & BILLS"},{"id":"transport","it":"TRASPORTI","en":"TRANSPORT"},{"id":"health","it":"SALUTE E BENESSERE","en":"HEALTH & WELLNESS"},{"id":"family","it":"FAMIGLIA E ANIMALI","en":"FAMILY & PETS"},{"id":"lifestyle","it":"TEMPO LIBERO","en":"LIFESTYLE"},{"id":"travel","it":"VIAGGI","en":"TRAVEL"},{"id":"work","it":"LAVORO E STUDI","en":"WORK & EDUCATION"},{"id":"finance","it":"RISPARMIO E OBIETTIVI","en":"SAVINGS & GOALS"}];
 const spendPresets=[{"category":"food","id":"coffee","symbol":"☕","it":"Caffè","en":"Coffee","price":3,"period":"daily"},{"category":"food","id":"lunch","symbol":"🥗","it":"Pranzo","en":"Lunch","price":15,"period":"daily"},{"category":"food","id":"groceries","symbol":"🛒","it":"Spesa","en":"Groceries","price":35,"period":"weekly"},{"category":"food","id":"dinner","symbol":"🍽️","it":"Cena","en":"Dinner","price":55,"period":"weekly"},{"category":"housing","id":"rent","symbol":"🏠","it":"Affitto","en":"Rent","price":900,"period":"monthly"},{"category":"transport","id":"mobility","symbol":"🚗","it":"Mobilità","en":"Mobility","price":250,"period":"monthly"},{"category":"housing","id":"bills","symbol":"⚡","it":"Bollette","en":"Bills","price":150,"period":"monthly"},{"category":"health","id":"gym","symbol":"🏋️","it":"Palestra","en":"Gym","price":45,"period":"monthly"},{"category":"lifestyle","id":"subscriptions","symbol":"📱","it":"Abbonamenti","en":"Subscriptions","price":25,"period":"monthly"},{"category":"health","id":"health","symbol":"❤","it":"Salute","en":"Healthcare","price":100,"period":"monthly"},{"category":"travel","id":"travel","symbol":"✈","it":"Viaggi","en":"Travel","price":200,"period":"monthly"},{"category":"finance","id":"savings","symbol":"◆","it":"Risparmio","en":"Savings","price":300,"period":"monthly"},{"category":"food","id":"breakfast","symbol":"🥐","it":"Colazione","en":"Breakfast","price":6,"period":"daily"},{"category":"food","id":"snack","symbol":"🍎","it":"Spuntini","en":"Snacks","price":4,"period":"daily"},{"category":"food","id":"takeaway","symbol":"🥡","it":"Asporto","en":"Takeaway","price":18,"period":"weekly"},{"category":"food","id":"foodDelivery","symbol":"🛵","it":"Consegne a domicilio","en":"Food delivery","price":20,"period":"weekly"},{"category":"food","id":"restaurant","symbol":"🍝","it":"Ristorante","en":"Restaurant meals","price":40,"period":"weekly"},{"category":"food","id":"supermarket","symbol":"🧺","it":"Supermercato","en":"Supermarket","price":80,"period":"weekly"},{"category":"food","id":"fruit","symbol":"🍓","it":"Frutta e verdura","en":"Fruit and vegetables","price":22,"period":"weekly"},{"category":"food","id":"bakery","symbol":"🥖","it":"Panetteria","en":"Bakery","price":9,"period":"weekly"},{"category":"food","id":"water","symbol":"💧","it":"Acqua e bevande","en":"Water and drinks","price":15,"period":"weekly"},{"category":"food","id":"coffeeBeans","symbol":"🫘","it":"Caffè a casa","en":"Coffee at home","price":20,"period":"monthly"},{"category":"food","id":"specialDinner","symbol":"🍽️","it":"Cena speciale","en":"Special dinner","price":90,"period":"monthly"},{"category":"food","id":"officeLunch","symbol":"🥪","it":"Pausa pranzo lavoro","en":"Workday lunch","price":12,"period":"daily"},{"category":"food","id":"eatingOut","symbol":"🍔","it":"Fast food","en":"Fast food","price":20,"period":"weekly"},{"category":"food","id":"dietFood","symbol":"🥑","it":"Alimentazione specifica","en":"Special diet","price":55,"period":"monthly"},{"category":"housing","id":"mortgage","symbol":"🏡","it":"Mutuo","en":"Mortgage","price":850,"period":"monthly"},{"category":"housing","id":"electricity","symbol":"💡","it":"Energia elettrica","en":"Electricity","price":90,"period":"monthly"},{"category":"housing","id":"gas","symbol":"🔥","it":"Gas","en":"Gas","price":55,"period":"monthly"},{"category":"housing","id":"waterUtility","symbol":"🚰","it":"Utenza acqua","en":"Water bill","price":20,"period":"monthly"},{"category":"housing","id":"internet","symbol":"🌐","it":"Fibra e internet","en":"Home internet","price":30,"period":"monthly"},{"category":"housing","id":"mobilePhone","symbol":"📲","it":"Telefonia mobile","en":"Mobile plan","price":12,"period":"monthly"},{"category":"housing","id":"condo","symbol":"🏢","it":"Spese condominiali","en":"Building fees","price":110,"period":"monthly"},{"category":"housing","id":"wasteTax","symbol":"♻️","it":"Tassa rifiuti","en":"Waste tax","price":22,"period":"monthly"},{"category":"housing","id":"homeInsurance","symbol":"🛡️","it":"Assicurazione casa","en":"Home insurance","price":18,"period":"monthly"},{"category":"housing","id":"maintenance","symbol":"🔧","it":"Manutenzione casa","en":"Home maintenance","price":60,"period":"monthly"},{"category":"housing","id":"cleaning","symbol":"🧽","it":"Prodotti pulizia","en":"Cleaning supplies","price":25,"period":"monthly"},{"category":"housing","id":"laundry","symbol":"🧺","it":"Lavanderia","en":"Laundry","price":20,"period":"monthly"},{"category":"housing","id":"furniture","symbol":"🪑","it":"Arredamento","en":"Furniture","price":70,"period":"monthly"},{"category":"housing","id":"appliances","symbol":"🧊","it":"Elettrodomestici","en":"Appliances","price":55,"period":"monthly"},{"category":"housing","id":"homeSupplies","symbol":"🧰","it":"Materiale domestico","en":"Household supplies","price":25,"period":"monthly"},{"category":"housing","id":"homeRenovation","symbol":"🏗️","it":"Ristrutturazione","en":"Renovation fund","price":200,"period":"monthly"},{"category":"housing","id":"propertyTax","symbol":"🏘️","it":"Imposte immobiliari","en":"Property taxes","price":60,"period":"monthly"},{"category":"transport","id":"fuel","symbol":"⛽","it":"Carburante","en":"Fuel","price":120,"period":"monthly"},{"category":"transport","id":"carInsurance","symbol":"🚘","it":"Assicurazione auto","en":"Car insurance","price":65,"period":"monthly"},{"category":"transport","id":"carTax","symbol":"🪪","it":"Bollo auto","en":"Car tax","price":25,"period":"monthly"},{"category":"transport","id":"carMaintenance","symbol":"🛠️","it":"Manutenzione auto","en":"Car maintenance","price":75,"period":"monthly"},{"category":"transport","id":"carWash","symbol":"🫧","it":"Lavaggio auto","en":"Car wash","price":15,"period":"monthly"},{"category":"transport","id":"parking","symbol":"🅿️","it":"Parcheggi","en":"Parking","price":45,"period":"monthly"},{"category":"transport","id":"highway","symbol":"🛣️","it":"Pedaggi","en":"Road tolls","price":30,"period":"monthly"},{"category":"transport","id":"publicTransport","symbol":"🚇","it":"Trasporti pubblici","en":"Public transport","price":45,"period":"monthly"},{"category":"transport","id":"taxi","symbol":"🚕","it":"Taxi e NCC","en":"Taxi and rides","price":45,"period":"monthly"},{"category":"transport","id":"bikeSharing","symbol":"🚲","it":"Bike e monopattini","en":"Bikes and scooters","price":25,"period":"monthly"},{"category":"transport","id":"train","symbol":"🚆","it":"Treno","en":"Rail travel","price":60,"period":"monthly"},{"category":"transport","id":"carLeasing","symbol":"🚙","it":"Rata auto","en":"Car payment","price":290,"period":"monthly"},{"category":"transport","id":"ebike","symbol":"🚴","it":"Bici elettrica","en":"Electric bike","price":50,"period":"monthly"},{"category":"transport","id":"motorbike","symbol":"🏍️","it":"Moto","en":"Motorbike costs","price":60,"period":"monthly"},{"category":"health","id":"pharmacy","symbol":"💊","it":"Farmacia","en":"Pharmacy","price":25,"period":"monthly"},{"category":"health","id":"doctor","symbol":"🩺","it":"Visite mediche","en":"Medical appointments","price":45,"period":"monthly"},{"category":"health","id":"dentist","symbol":"🦷","it":"Dentista","en":"Dentist","price":45,"period":"monthly"},{"category":"health","id":"healthInsurance","symbol":"➕","it":"Assicurazione sanitaria","en":"Health insurance","price":75,"period":"monthly"},{"category":"health","id":"fitnessClasses","symbol":"🧘","it":"Corsi sportivi","en":"Fitness classes","price":60,"period":"monthly"},{"category":"health","id":"physiotherapy","symbol":"👐","it":"Fisioterapia","en":"Physiotherapy","price":45,"period":"monthly"},{"category":"health","id":"wellness","symbol":"🧖","it":"Benessere e SPA","en":"Wellness and spa","price":55,"period":"monthly"},{"category":"health","id":"haircut","symbol":"💇","it":"Parrucchiere","en":"Haircuts","price":25,"period":"monthly"},{"category":"health","id":"skincare","symbol":"🧴","it":"Cura personale","en":"Personal care","price":30,"period":"monthly"},{"category":"health","id":"cosmetics","symbol":"✨","it":"Cosmetici","en":"Cosmetics","price":30,"period":"monthly"},{"category":"health","id":"therapy","symbol":"🧠","it":"Supporto psicologico","en":"Mental wellbeing","price":75,"period":"monthly"},{"category":"health","id":"optician","symbol":"👓","it":"Occhiali e lenti","en":"Glasses and lenses","price":25,"period":"monthly"},{"category":"health","id":"supplements","symbol":"🥤","it":"Integratori alimentari","en":"Nutritional supplements","price":30,"period":"monthly"},{"category":"family","id":"pets","symbol":"🐾","it":"Animali domestici","en":"Pets","price":65,"period":"monthly"},{"category":"family","id":"petFood","symbol":"🦴","it":"Cibo animali","en":"Pet food","price":40,"period":"monthly"},{"category":"family","id":"vet","symbol":"🐕","it":"Veterinario","en":"Veterinary care","price":35,"period":"monthly"},{"category":"family","id":"petInsurance","symbol":"🐶","it":"Assicurazione animali","en":"Pet insurance","price":20,"period":"monthly"},{"category":"family","id":"dogGrooming","symbol":"🛁","it":"Toelettatura","en":"Pet grooming","price":25,"period":"monthly"},{"category":"family","id":"childCare","symbol":"🧸","it":"Asilo e babysitter","en":"Childcare","price":350,"period":"monthly"},{"category":"family","id":"childEducation","symbol":"📘","it":"Scuola figli","en":"Children's education","price":150,"period":"monthly"},{"category":"family","id":"familyGifts","symbol":"🎁","it":"Regali famiglia","en":"Family gifts","price":45,"period":"monthly"},{"category":"family","id":"familySupport","symbol":"🤝","it":"Supporto familiare","en":"Family support","price":150,"period":"monthly"},{"category":"family","id":"kidsActivities","symbol":"⚽","it":"Attività bambini","en":"Kids' activities","price":60,"period":"monthly"},{"category":"family","id":"petSitting","symbol":"🐈","it":"Pet sitter","en":"Pet sitter","price":30,"period":"monthly"},{"category":"family","id":"schoolSupplies","symbol":"🎒","it":"Materiale scolastico","en":"School supplies","price":25,"period":"monthly"},{"category":"lifestyle","id":"streaming","symbol":"🎬","it":"Streaming video","en":"Video streaming","price":18,"period":"monthly"},{"category":"lifestyle","id":"music","symbol":"🎧","it":"Musica","en":"Music","price":12,"period":"monthly"},{"category":"lifestyle","id":"gaming","symbol":"🎮","it":"Videogiochi","en":"Video games","price":30,"period":"monthly"},{"category":"lifestyle","id":"cinema","symbol":"🎟️","it":"Cinema","en":"Cinema","price":20,"period":"monthly"},{"category":"lifestyle","id":"concerts","symbol":"🎤","it":"Concerti","en":"Concerts","price":40,"period":"monthly"},{"category":"lifestyle","id":"fashion","symbol":"👕","it":"Abbigliamento","en":"Clothing","price":75,"period":"monthly"},{"category":"lifestyle","id":"shoes","symbol":"👟","it":"Scarpe","en":"Shoes","price":40,"period":"monthly"},{"category":"lifestyle","id":"technology","symbol":"💻","it":"Tecnologia","en":"Technology","price":90,"period":"monthly"},{"category":"lifestyle","id":"electronics","symbol":"📷","it":"Elettronica","en":"Electronics","price":60,"period":"monthly"},{"category":"lifestyle","id":"hobby","symbol":"🎨","it":"Hobby","en":"Hobbies","price":40,"period":"monthly"},{"category":"lifestyle","id":"sports","symbol":"🎾","it":"Sport","en":"Sports","price":40,"period":"monthly"},{"category":"lifestyle","id":"books","symbol":"📚","it":"Libri","en":"Books","price":20,"period":"monthly"},{"category":"lifestyle","id":"events","symbol":"🎪","it":"Eventi","en":"Events","price":50,"period":"monthly"},{"category":"lifestyle","id":"nightOut","symbol":"🌙","it":"Serata fuori","en":"Night out","price":45,"period":"weekly"},{"category":"lifestyle","id":"gifts","symbol":"🎁","it":"Regali","en":"Gifts","price":35,"period":"monthly"},{"category":"lifestyle","id":"charity","symbol":"💛","it":"Beneficenza","en":"Charity","price":30,"period":"monthly"},{"category":"lifestyle","id":"photography","symbol":"📸","it":"Fotografia","en":"Photography","price":35,"period":"monthly"},{"category":"lifestyle","id":"garden","symbol":"🌿","it":"Giardinaggio","en":"Gardening","price":25,"period":"monthly"},{"category":"travel","id":"holidays","symbol":"🏖️","it":"Vacanze","en":"Holidays","price":250,"period":"monthly"},{"category":"travel","id":"weekends","symbol":"🏕️","it":"Weekend fuori","en":"Weekend trips","price":120,"period":"monthly"},{"category":"travel","id":"hotel","symbol":"🏨","it":"Hotel","en":"Hotels","price":90,"period":"monthly"},{"category":"travel","id":"flights","symbol":"🛫","it":"Voli","en":"Flights","price":125,"period":"monthly"},{"category":"travel","id":"travelInsurance","symbol":"🧳","it":"Assicurazione viaggio","en":"Travel insurance","price":20,"period":"monthly"},{"category":"travel","id":"excursions","symbol":"🗺️","it":"Escursioni","en":"Excursions","price":60,"period":"monthly"},{"category":"travel","id":"longTrip","symbol":"🌎","it":"Viaggio lungo","en":"Long trip","price":300,"period":"monthly"},{"category":"travel","id":"travelPocket","symbol":"💳","it":"Budget in viaggio","en":"Travel spending","price":120,"period":"monthly"},{"category":"travel","id":"visas","symbol":"📄","it":"Visti e documenti","en":"Visas and documents","price":15,"period":"monthly"},{"category":"travel","id":"vacationFood","symbol":"🍹","it":"Ristoranti in viaggio","en":"Holiday dining","price":65,"period":"monthly"},{"category":"work","id":"coworking","symbol":"🏢","it":"Coworking","en":"Coworking","price":140,"period":"monthly"},{"category":"work","id":"software","symbol":"🧩","it":"Software","en":"Software","price":35,"period":"monthly"},{"category":"work","id":"cloud","symbol":"☁️","it":"Cloud e storage","en":"Cloud storage","price":12,"period":"monthly"},{"category":"work","id":"aiTools","symbol":"🤖","it":"Strumenti AI","en":"AI tools","price":25,"period":"monthly"},{"category":"work","id":"courses","symbol":"🎓","it":"Corsi di formazione","en":"Training courses","price":60,"period":"monthly"},{"category":"work","id":"booksStudy","symbol":"📖","it":"Libri di studio","en":"Study books","price":30,"period":"monthly"},{"category":"work","id":"university","symbol":"🏛️","it":"Università","en":"University","price":200,"period":"monthly"},{"category":"work","id":"workCommute","symbol":"🚌","it":"Trasferta lavoro","en":"Work commute","price":80,"period":"monthly"},{"category":"work","id":"devices","symbol":"🖥️","it":"Dispositivi lavoro","en":"Work equipment","price":65,"period":"monthly"},{"category":"work","id":"domain","symbol":"🔗","it":"Domini e hosting","en":"Domains and hosting","price":18,"period":"monthly"},{"category":"work","id":"professional","symbol":"🧑‍💼","it":"Consulenze professionali","en":"Professional advice","price":100,"period":"monthly"},{"category":"work","id":"business","symbol":"📊","it":"Spese attività","en":"Business expenses","price":120,"period":"monthly"},{"category":"finance","id":"emergency","symbol":"🛟","it":"Fondo emergenza","en":"Emergency fund","price":200,"period":"monthly"},{"category":"finance","id":"investing","symbol":"📈","it":"Investimenti","en":"Investing","price":250,"period":"monthly"},{"category":"finance","id":"pension","symbol":"🏦","it":"Previdenza","en":"Retirement savings","price":150,"period":"monthly"},{"category":"finance","id":"taxes","symbol":"🧾","it":"Imposte","en":"Taxes","price":200,"period":"monthly"},{"category":"finance","id":"debt","symbol":"💳","it":"Rata finanziamento","en":"Debt payments","price":150,"period":"monthly"},{"category":"finance","id":"insurance","symbol":"🛡️","it":"Assicurazioni","en":"Insurance","price":60,"period":"monthly"},{"category":"finance","id":"financialAdvisor","symbol":"👔","it":"Consulente finanziario","en":"Financial adviser","price":65,"period":"monthly"},{"category":"finance","id":"homeDeposit","symbol":"🏠","it":"Acconto casa","en":"Home deposit savings","price":250,"period":"monthly"},{"category":"finance","id":"futureGoals","symbol":"🎯","it":"Obiettivi futuri","en":"Future goals","price":200,"period":"monthly"},{"category":"finance","id":"stakingReserves","symbol":"🪙","it":"Riserva reward","en":"Staking reserve","price":100,"period":"monthly"},{"category":"finance","id":"giftFund","symbol":"🎀","it":"Fondo regali","en":"Gift fund","price":40,"period":"monthly"},{"category":"finance","id":"buffer","symbol":"🧱","it":"Fondo imprevisti","en":"Unexpected costs fund","price":100,"period":"monthly"}];
 const spendText={
  it:{
   summary:'TOTALE LISTA / MESE',coverage:'Copertura complessiva',setGoal:'USA COME OBIETTIVO',
   editor:'AGGIUNGI UNA SPESA',presets:'SCEGLI UN ESEMPIO',choose:'Seleziona una voce…',
   name:'COSA VUOI COPRIRE?',placeholder:'Es. bollette, palestra, viaggio',
   price:'IMPORTO',period:'FREQUENZA',daily:'Giorno',weekly:'Settimana',monthly:'Mese',
   add:'AGGIUNGI ALLA LISTA',remove:'Rimuovi',manage:'GESTISCI',done:'FATTO',confirm:'CONFERMA',empty:'Lista vuota. Aggiungi una spesa.',
   required:'Inserisci una voce e un importo maggiore di zero.',
   added:'Aggiunto alla lista',goalSet:'Obiettivo mensile aggiornato',
   foot:'Ogni voce è confrontata singolarmente con le reward; il totale somma tutte le spese.',
   covered:'Coperto',percent:'coperto',unavailable:'Dati reward in attesa'
  },
  en:{
   summary:'LIST TOTAL / MONTH',coverage:'Total expense coverage',setGoal:'SET AS TARGET',
   editor:'ADD AN EXPENSE',presets:'CHOOSE AN EXAMPLE',choose:'Select an item…',
   name:'WHAT WOULD YOU LIKE TO COVER?',placeholder:'E.g. bills, gym, travel',
   price:'AMOUNT',period:'FREQUENCY',daily:'Day',weekly:'Week',monthly:'Month',
   add:'ADD TO LIST',remove:'Remove',manage:'MANAGE',done:'DONE',confirm:'CONFIRM',empty:'No items yet. Add an expense.',
   required:'Enter a name and an amount greater than zero.',
   added:'Added to your list',goalSet:'Monthly target updated',
   foot:'Each item is compared separately to rewards; all items count toward the total.',
   covered:'Covered',percent:'covered',unavailable:'Waiting for reward data'
  }
 };
 let spending=[];
 let spendingId=0;
 let spendingManage=false,pendingDeleteId='';
 const st=k=>spendText[language()][k];
 const spendMonths={daily:365/12,weekly:365/7/12,monthly:1};
 const monthlyCost=item=>item.price*spendMonths[item.period];
 const totalSpending=()=>spending.reduce((sum,item)=>sum+monthlyCost(item),0);
 function presetName(item){const p=spendPresets.find(p=>p.id===item.preset);return p?p[language()]:item.name;}
 function normalizeSpending(items){
  if(!Array.isArray(items))return null;
  const used=new Set();
  return items.slice(0,250).map((x,i)=>{
   const price=Number(x?.price),name=String(x?.name||'').trim().slice(0,56);
   const period=['daily','weekly','monthly'].includes(x?.period)?x.period:'monthly';
   const preset=spendPresets.find(p=>p.id===x?.preset)?.id||'';
   const id=String(x?.id||('item-'+i)).slice(0,80);
   if(!(price>0)||!Number.isFinite(price)||(!name&&!preset)||used.has(id))return null;
   used.add(id);
   return{id,name:name||spendPresets.find(p=>p.id===preset)?.it||'',price,period,preset};
  }).filter(Boolean);
 }
 function readSpending(){
  try{
   const saved=JSON.parse(localStorage.getItem(SPEND_STORE)||'null');
   const list=normalizeSpending(saved?.items);
   if(list!==null){spending=list;return;}
  }catch(_){}
  spending=spendPresets.slice(0,6).map(p=>({id:'preset-'+p.id,name:p.it,price:p.price,period:p.period,preset:p.id}));
 }
 function saveSpending(){
  try{localStorage.setItem(SPEND_STORE,JSON.stringify({items:spending}));}catch(_){}
 }
 function populateSpendingPresets(){
  const select=$('freedomSpendingPreset');
  const query=$('freedomSpendingSearch').value.trim().normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const key=language()+'|'+query;
  if(select.dataset.catalogKey===key)return;
  const before=select.value;
  select.replaceChildren();
  const empty=document.createElement('option');
  empty.value='';empty.textContent=st('choose');select.append(empty);
  let count=0;
  for(const category of spendCategories){
   const match=spendPresets.filter(p=>{
    if(p.category!==category.id)return false;
    if(!query)return true;
    const haystack=(p.it+' '+p.en+' '+category.it+' '+category.en).normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return haystack.includes(query);
   });
   if(!match.length)continue;
   const group=document.createElement('optgroup');
   group.label=category[language()];
   for(const preset of match){
    const option=document.createElement('option');
    option.value=preset.id;
    option.textContent=preset[language()];
    group.append(option);
    count++;
   }
   select.append(group);
  }
  if(count===0)empty.textContent=language()==='en'?'No matches · add your own':'Nessun risultato · scrivi la tua';
  select.dataset.catalogKey=key;
  select.value=before;
  if(select.selectedIndex<0)select.value='';
 }
 function editSpendingLanguage(){
  txt('freedomSpendingSummaryLabel',st('summary'));
  txt('freedomUseSpendingGoal',st('setGoal'));
  txt('freedomSpendingEditorLabel',st('editor'));
  txt('freedomSpendingPresetLabel',st('presets'));
  txt('freedomSpendingSearchLabel',language()==='en'?'SEARCH THE CATALOG':'CERCA NEL CATALOGO');
  txt('freedomSpendingNameLabel',st('name'));
  txt('freedomSpendingPriceLabel',st('price')+' ('+(shownCurrency==='USD'?'$':'€')+')');
  txt('freedomSpendingPeriodLabel',st('period'));
  txt('freedomSpendingSubmit',st('add'));
  txt('freedomSpendingManage',spendingManage?st('done'):st('manage'));
  $('freedomSpendingManage').setAttribute('aria-pressed',String(spendingManage));
  $('freedomOptions').classList.toggle('is-managing',spendingManage);
  txt('freedomLifestyleFoot',st('foot'));
  $('freedomSpendingName').placeholder=st('placeholder');
  $('freedomSpendingSearch').placeholder=language()==='en'?'Find an expense…':'Cerca una spesa…';
  const periods=$('freedomSpendingPeriod');
  for(const option of periods.options)option.textContent=st(option.value);
  populateSpendingPresets();
 }
 function bindSpending(){
  $('freedomSpendingSearch').addEventListener('input',populateSpendingPresets);
  $('freedomSpendingManage').addEventListener('click',()=>{
   spendingManage=!spendingManage;
   pendingDeleteId='';
   lastRenderFingerprint='';
   render();
  });
  $('freedomSpendingPreset').addEventListener('change',event=>{
   const preset=spendPresets.find(p=>p.id===event.target.value);
   if(!preset)return;
   $('freedomSpendingName').value=preset[language()];
   $('freedomSpendingPrice').value=String(Math.round((shownCurrency==='USD'?preset.price/rateEURperUSD:preset.price)*100)/100);
   $('freedomSpendingPeriod').value=preset.period;
   txt('freedomSpendingError','');
  });
  $('freedomSpendingForm').addEventListener('submit',event=>{
   event.preventDefault();
   const name=$('freedomSpendingName').value.trim().slice(0,56);
   const amount=Number($('freedomSpendingPrice').value);
   const price=amount*(shownCurrency==='USD'?rateEURperUSD:1);
   if(!name||!(price>0)||!Number.isFinite(price)){
    txt('freedomSpendingError',st('required'));return;
   }
   const period=$('freedomSpendingPeriod').value;
   const preset=spendPresets.find(p=>p.id===$('freedomSpendingPreset').value);
   // An edited template name becomes an independent, fully user-named entry.
   const presetId=preset&&name===preset[language()]?preset.id:'';
   spending.push({id:'custom-'+Date.now()+'-'+(++spendingId),name,price,period,preset:presetId});
   saveSpending();
   $('freedomSpendingName').value='';
   $('freedomSpendingPrice').value='';
   $('freedomSpendingPreset').value='';
   $('freedomSpendingSearch').value='';
   populateSpendingPresets();
   txt('freedomSpendingError',st('added'));
   lastRenderFingerprint='';
   render();
   $('freedomSpendingName').focus({preventScroll:true});
  });
  $('freedomLifestyle').addEventListener('click',event=>{
   const button=event.target.closest('[data-spend-delete]');
   if(!button||!spendingManage)return;
   const id=button.dataset.spendDelete;
   if(pendingDeleteId!==id){
    pendingDeleteId=id;
    lastRenderFingerprint='';
    render();
    return;
   }
   pendingDeleteId='';
   spending=spending.filter(item=>item.id!==id);
   saveSpending();txt('freedomSpendingError','');
   lastRenderFingerprint='';
   render();
  });
  $('freedomUseSpendingGoal').addEventListener('click',()=>{
   const total=totalSpending();
   if(!(total>0)||!Number.isFinite(total))return;
   const minEUR=shownCurrency==='USD'?rateEURperUSD:1;
   prefs.budget=Math.max(minEUR,total);
   writePrefs();
   const formatted=String(Math.round(budgetAmountInCurrency()*100)/100);
   $('freedomBudget').value=formatted;
   lastFormattedBudget=formatted;
   lastRenderFingerprint='';
   render();
   txt('freedomSpendingError',st('goalSet'));
  });
 }
 const copy={
  it:{
   intro:'Patrimonio e rendita a colpo d’occhio.',
   selected:'WALLET SELEZIONATO',all:'TUTTI I WALLET',price:'PREZZO INJ LIVE',status:'STATO FINANZIARIO',dayLabel:'REWARD / GIORNO',monthLabel:'REWARD / MESE',wealthEyebrow:'SCALA PATRIMONIALE',spendEyebrow:'SPESE QUOTIDIANE',planEyebrow:'OBIETTIVO DI LIBERTÀ',
   notReady:'DATI IN ARRIVO',notReadyInfo:'In attesa dei dati del wallet.',
   incomplete:'DATI DA COMPLETARE',incompleteInfo:'In attesa del rendimento APR o di un wallet.',estimate:'STIMA CON ULTIMI DATI',estimateInfo:'Valori indicativi; aggiornamento in corso.',
   no:'COPERTURA PARZIALE',noInfo:'Reward sotto l’obiettivo mensile.',
   yes:'OBIETTIVO COPERTO',yesInfo:'Reward teoricamente sufficienti. Non garantite.',
   covered:'SPESE COPERTE',target:'OBIETTIVO 100%',short:'MANCANO',worth:'PATRIMONIO INJ',reward:'APR netto validator',
   grade:'IL TUO GRADINO',tierFoot:'Fasce indicative, non ufficiali.',
   daily:'COSA COPRONO LE REWARD',estimated:'STIME',lifestyleNote:'Costi indicativi.',
   plan:'IL TUO OBIETTIVO',budget:'SPESE / MESE (€)',buffer:'MARGINE (%)',
   needs:'INJ NECESSARI',missing:'INJ MANCANTI',stress:'SCENARIO -50%',stressNote:'Prezzo −50% · APR −30%',
   disclaimer:'Simulazioni non garantite. Prezzo, APR e imposte possono cambiare. Il margine non è una stima fiscale.',
   synced:'WALLET AGGIORNATO',stale:'DATI DA AGGIORNARE',offline:'DATI NON DISPONIBILI',privacy:'PRIVACY ATTIVA',zero:'NON COPERTO',
   each:'OGNI GIORNO',once:'1 OGNI',days:'GIORNI',monthly:'MESE',coveredWord:'COPERTO',coins:'INJ',next:'PROSSIMO LIVELLO',max:'MASSIMO LIVELLO',priceWaiting:'QUOTAZIONE IN ATTESA',
   margin:'Reward utilizzabili',actual:'Prima del margine',spend:'Spese mensili'
  },
  en:{
   intro:'Wealth and staking income at a glance.',
   selected:'SELECTED WALLET',all:'ALL WALLETS',price:'LIVE INJ PRICE',status:'FINANCIAL STATUS',dayLabel:'REWARDS / DAY',monthLabel:'REWARDS / MONTH',wealthEyebrow:'WEALTH LADDER',spendEyebrow:'DAILY LIFESTYLE',planEyebrow:'FREEDOM TARGET',
   notReady:'LOADING DATA',notReadyInfo:'Waiting for wallet data.',
   incomplete:'DATA NOT READY',incompleteInfo:'Waiting for APR or a wallet.',estimate:'ESTIMATE FROM LAST DATA',estimateInfo:'Indicative figures; refreshing in background.',
   no:'PARTIAL COVERAGE',noInfo:'Rewards below your monthly target.',
   yes:'TARGET COVERED',yesInfo:'Rewards may cover your target. Not guaranteed.',
   covered:'EXPENSES COVERED',target:'100% TARGET',short:'STILL NEEDED',worth:'INJ NET WORTH',reward:'Net validator APR',
   grade:'WEALTH LEVEL',tierFoot:'Illustrative tiers, not official rankings.',
   daily:'REWARD SPENDING POWER',estimated:'ESTIMATES',lifestyleNote:'Illustrative costs.',
   plan:'YOUR TARGET',budget:'SPENDING / MONTH (€)',buffer:'BUFFER (%)',
   needs:'INJ REQUIRED',missing:'INJ TO GO',stress:'DOWNSIDE -50%',stressNote:'Price −50% · APR −30%',
   disclaimer:'Estimates, not guaranteed income. Price, APR and taxes may change. The buffer is not a tax estimate.',
   synced:'WALLET UPDATED',stale:'DATA NEEDS REFRESH',offline:'DATA UNAVAILABLE',privacy:'PRIVACY MODE',zero:'NOT COVERED',
   each:'EACH DAY',once:'1 EVERY',days:'DAYS',monthly:'MONTH',coveredWord:'COVERED',coins:'INJ',next:'NEXT LEVEL',max:'TOP LEVEL',priceWaiting:'WAITING FOR QUOTE',
   margin:'Spendable rewards',actual:'Before buffer',spend:'Monthly expenses'
  }
 };
 let prefs={budget:1500,buffer:30},selected='',hasUserSelected=false,timer=null;
 let shownCurrency='EUR',rateEURperUSD=1,lastFormattedBudget='';
 let lastRenderFingerprint='';
 const valid=n=>Number.isFinite(n)&&n>=0;
 const positive=n=>Number.isFinite(n)&&n>0;
 const clamp=(n,min,max,otherwise)=>Number.isFinite(n)?Math.min(max,Math.max(min,n)):otherwise;
 const num=n=>typeof n==='number'?n:Number(n);
 const fmt=(value,digits=2)=>new Intl.NumberFormat(language()==='en'?'en-US':'it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
 const inj=value=>valid(value)?fmt(value,value>=1000?1:3):'—';
 const language=()=>document.documentElement.lang==='en'?'en':'it';
 const t=k=>copy[language()][k];
 const txt=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 const money=(v,currency='EUR')=>valid(v)?new Intl.NumberFormat(language()==='en'?'en-US':'it-IT',{style:'currency',currency,currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(v):'—';
 function readPrefs(){
  try{const p=JSON.parse(localStorage.getItem(STORE)||'{}');prefs.budget=(Number.isFinite(Number(p.budget))&&Number(p.budget)>0)?Number(p.budget):1500;prefs.buffer=clamp(num(p.buffer),0,90,30)}catch(_){}
  $('freedomBudget').value=String(prefs.budget);
  lastFormattedBudget=String(prefs.budget);
  $('freedomBuffer').value=String(prefs.buffer);
 }
 function writePrefs(){try{localStorage.setItem(STORE,JSON.stringify(prefs))}catch(_){}}
 function budgetAmountInCurrency(currency=shownCurrency,rate=rateEURperUSD){
  return prefs.budget*(currency==='USD'?1/Math.max(rate,0.000001):1);
 }
 function syncBudgetCurrency(source){
  const currency=source.currency==='USD'?'USD':'EUR';
  const rate=positive(num(source.eurRate))?num(source.eurRate):rateEURperUSD;
  const changed=currency!==shownCurrency;
  shownCurrency=currency;rateEURperUSD=rate;
  // Every displayed currency has a minimum editable goal of 1 unit.
  // No arbitrary upper limit is applied.
  if(budgetAmountInCurrency(currency,rate)<1){
    prefs.budget=currency==='EUR'?1:rate;
    writePrefs();
    lastFormattedBudget='';
  }
  txt('freedomBudgetLabel',t('budget').replace('€',currency==='USD'?'$':'€'));
  const input=$('freedomBudget');
  if((changed||!lastFormattedBudget)&&document.activeElement!==input){
   const value=String(Math.round(budgetAmountInCurrency(currency,rate)*100)/100);
   input.value=value;lastFormattedBudget=value;
  }
 }
 function parentSource(){
  try{
   const p=window.parent;
   if(p===window||p.location.origin!==location.origin)return null;
   return typeof p.INJ_FINANCIAL_FREEDOM_SOURCE==='function'?p.INJ_FINANCIAL_FREEDOM_SOURCE():null;
  }catch(_){return null}
 }
 function setTheme(source){
  const lang=source?.language==='en'?'en':'it';
  document.documentElement.lang=lang;
  if(source?.theme)document.documentElement.dataset.theme=source.theme;
  document.body.classList.toggle('privacy-active',Boolean(source?.privacy));
 }
 function localize(){
  txt('freedomIntro',t('intro'));txt('freedomWalletLabel',t('selected'));txt('freedomPriceLabel',t('price'));
  txt('freedomStatusLabel',t('status'));txt('freedomCoverageLabel',t('covered'));txt('freedomNetLabel',language()==='en'?'SPENDABLE / MONTH':'UTILIZZABILI / MESE');txt('freedomGoalLabel',language()==='en'?'SPENDING / MONTH':'SPESE / MESE');txt('freedomBufferHint',language()==='en'?'Rewards held back':'Reward non spendibili');
  txt('freedomWorthLabel',t('worth'));txt('freedomDayLabel',t('dayLabel'));txt('freedomMonthLabel',t('monthLabel'));txt('freedomWealthEyebrow',t('wealthEyebrow'));txt('freedomSpendEyebrow',t('spendEyebrow'));txt('freedomPlanEyebrow',t('planEyebrow'));txt('freedomWealthTitle',t('grade'));txt('freedomTierFoot',t('tierFoot'));
  txt('freedomSpendTitle',t('daily'));txt('freedomSpendHint',t('estimated'));txt('freedomLifestyleFoot',t('lifestyleNote'));
  txt('freedomPlanTitle',t('plan'));txt('freedomBudgetLabel',t('budget'));txt('freedomBufferLabel',t('buffer'));
  txt('freedomTargetLabel',t('needs'));txt('freedomMissingLabel',t('missing'));
  txt('freedomStressLabel',t('stress'));txt('freedomStressInfo',t('stressNote'));txt('freedomDisclaimer',t('disclaimer'));
  $('freedomClose').ariaLabel=language()==='en'?'Close Financial Freedom':'Torna alla Home';
  editSpendingLanguage();
 }
 function walletOptions(source){
  const wallets=Array.isArray(source?.wallets)?source.wallets:[];
  const addresses=wallets.map(w=>w.address);
  if(!hasUserSelected||(!addresses.includes(selected)&&selected!=='ALL')){
   selected=addresses.includes(source?.selectedAddress)?source.selectedAddress:(addresses[0]||'');
   hasUserSelected=false;
  }
  const options=[...(wallets.length>1?[{value:'ALL',text:t('all')}]:[]),...wallets.map((w,i)=>({value:w.address,text:String(w.label||('Wallet '+(i+1)))}))];
  const key=JSON.stringify(options);
  const select=$('freedomWallet');
  if(key!==select.dataset.optionsKey){
   select.replaceChildren();
   for(const opt of options){const node=document.createElement('option');node.value=opt.value;node.textContent=opt.text;select.append(node)}
   select.dataset.optionsKey=key;
  }
  if(selected==='ALL'&&wallets.length<=1)selected=wallets[0]?.address||'';
  if(select.value!==selected)select.value=selected;
 }
 function selectedPortfolio(source){
  const wallets=Array.isArray(source?.wallets)?source.wallets:[];
  const included=selected==='ALL'?wallets:wallets.filter(w=>w.address===selected);
  if(included.length===0)return{ready:false,reason:'notReady'};
  let total=0,staked=0,daily=0,aprNumerator=0,validRows=0,aprMissing=false,stale=false;
  for(const w of included){
   if(!positive(num(w.updated))||!valid(num(w.total))||!valid(num(w.staked))){continue}
   validRows++;
   const tInj=num(w.total),sInj=num(w.staked);total+=tInj;staked+=sInj;
   if(Date.now()-num(w.updated)>30*60*1000)stale=true;
   if(sInj>0){
    const apr=num(w.apr);
    if(!valid(apr)||apr>200||w.apr==null){aprMissing=true;continue}
    aprNumerator+=sInj*apr;
    daily+=sInj*apr/100/365;
   }
  }
  const complete=validRows===included.length&&!aprMissing&&!stale;
  return{ready:validRows>0,complete,total,staked,daily,apr:staked>0?aprNumerator/staked:0,stale,aprMissing,validRows,walletCount:included.length,reason:complete?'':'incomplete'};
 }
 function renderTiers(worthEUR){
  const index=tiers.reduce((last,entry,i)=>worthEUR>=entry.min?i:last,0);
  const host=$('freedomTierTrack');
  host.replaceChildren();
  tiers.forEach((entry,i)=>{
   const node=document.createElement('div');node.className='freedom-tier'+(i===index?' current':i<index?' reached':'');
   const bar=document.createElement('div');bar.className='freedom-tier-bar';
   const title=document.createElement('strong');title.textContent=entry[language()];
   const value=document.createElement('small');value.textContent=entry.label;
   node.append(bar,title,value);host.append(node);
  });
  txt('freedomTier',String(index+1).padStart(2,'0')+' / 06');
  const next=tiers[index+1];
  const currency=shownCurrency;
  const convertedNext=currency==='USD'?(next?.min||0)/rateEURperUSD:next?.min||0;
  const convertedShort=currency==='USD'?Math.max(0,(next?.min||0)-worthEUR)/rateEURperUSD:Math.max(0,(next?.min||0)-worthEUR);
  txt('freedomTierFoot',next?t('next')+': '+money(convertedNext,currency)+' · +'+money(convertedShort,currency):t('max')+' · '+t('tierFoot'));
 }
 function lifestyleRows(dailyEUR,complete){
  const host=$('freedomLifestyle');
  const monthlyAvailable=complete?dailyEUR*365/12:NaN;
  const currency=shownCurrency;
  const total=totalSpending();
  const totalValid=Number.isFinite(total)&&total>0;
  txt('freedomSpendingTotal',Number.isFinite(total)?money(currency==='USD'?total/rateEURperUSD:total,currency):'—');
  const overall=complete&&totalValid?monthlyAvailable/total*100:NaN;
  txt('freedomSpendingSummaryCoverage',Number.isFinite(overall)?st('coverage')+': '+fmt(Math.min(9999,overall),0)+'%':st('unavailable'));
  $('freedomUseSpendingGoal').disabled=!totalValid;
  host.replaceChildren();
  if(!spending.length){
   const empty=document.createElement('div');
   empty.className='freedom-spending-empty';empty.textContent=st('empty');
   host.append(empty);
   return;
  }
  for(const item of spending){
   const costMonth=monthlyCost(item);
   const value=Number.isFinite(costMonth)&&costMonth>0&&complete?monthlyAvailable/costMonth*100:NaN;
   const percent=Number.isFinite(value)?Math.min(9999,value):NaN;
   const template=spendPresets.find(p=>p.id===item.preset);
   const node=document.createElement('article');
   node.className='freedom-lifestyle-item'+(Number.isFinite(percent)&&percent<100?' not-yet':'');
   const icon=document.createElement('span');icon.className='freedom-lifestyle-emoji';
   icon.textContent=template?.symbol||'◈';
   const detail=document.createElement('div');detail.className='freedom-lifestyle-name';
   const name=document.createElement('strong');name.textContent=presetName(item);
   const price=document.createElement('small');
   price.textContent=money(currency==='USD'?item.price/rateEURperUSD:item.price,currency)+' / '+st(item.period);
   detail.append(name,price);
   const coverage=document.createElement('span');
   coverage.className='freedom-lifestyle-result private';
   coverage.textContent=Number.isFinite(percent)?(percent>=100?st('covered'):fmt(percent,0)+'% '+st('percent')):'—';
   // Time to afford one full instance of this item from the projected
   // *spendable* daily rewards (after the selected prudence buffer).
   // This is separate from monthly coverage of its recurring schedule.
   const cadence=document.createElement('small');
   cadence.className='freedom-lifestyle-cadence private';
   if(!complete||!Number.isFinite(dailyEUR)){
    cadence.textContent='—';
   }else if(dailyEUR<=0){
    cadence.textContent=language()==='en'?'NOT COVERED':'NON COPERTO';
   }else if(dailyEUR>=item.price){
    const count=Math.floor(dailyEUR/item.price);
    cadence.textContent=fmt(Math.max(1,count),0)+(language()==='en'?' PER DAY':' SPESE AL GIORNO');
   }else{
    const days=Math.ceil(item.price/dailyEUR);
    cadence.textContent=language()==='en'?'1 EVERY '+fmt(days,0)+' DAYS':'1 SPESA OGNI '+fmt(days,0)+' GIORNI';
   }
   const remove=document.createElement('button');
   remove.type='button';
   remove.className='freedom-lifestyle-remove';
   remove.dataset.spendDelete=item.id;
   const confirmed=pendingDeleteId===item.id;
   remove.classList.toggle('is-confirming',confirmed);
   remove.setAttribute('aria-label',(confirmed?st('confirm'):st('remove'))+' '+presetName(item));
   remove.title=(confirmed?st('confirm'):st('remove'))+' '+presetName(item);
   remove.textContent=confirmed?st('confirm'):st('remove');
   const bar=document.createElement('div');
   bar.className='freedom-lifestyle-progress';
   const fill=document.createElement('span');
   fill.style.width=Number.isFinite(percent)?Math.max(0,Math.min(100,percent))+'%':'0%';
   bar.append(fill);
   node.append(icon,detail,coverage,cadence,remove,bar);
   host.append(node);
  }
 }
 function resetOutput(reason){
  txt('freedomStatusTitle',t(reason));txt('freedomStatusExplain',t(reason+'Info'));
  for(const id of ['freedomCoverage','freedomWorth','freedomInj','freedomDay','freedomDayInj','freedomMonth','freedomRewardInfo','freedomTier','freedomTargetInj','freedomMissingInj','freedomStressCoverage','freedomCoverageFoot','freedomGoal'])txt(id,'—');
  $('freedomMeter').style.setProperty('--freedom-progress','0%');
  $('freedomBarFill').style.width='0%';
  $('freedomTierTrack').replaceChildren();
  lifestyleRows(0,false);
 }
 function render(){
  const source=parentSource();
  if(!source){
   lastRenderFingerprint='';
   localize();txt('freedomPrice','—');txt('freedomUpdated',t('offline'));resetOutput('notReady');
   $('freedomFeed').classList.add('is-offline');return;
  }
  setTheme(source);localize();syncBudgetCurrency(source);editSpendingLanguage();walletOptions(source);
  const p=selectedPortfolio(source);
  const price=num(source.price),fx=num(source.eurRate);
  const marketFresh=positive(num(source.priceAt))&&Date.now()-num(source.priceAt)<120000;
  const fxConfirmed=source.fxVerified===true;
  const fingerprint=JSON.stringify([
    language(),source.theme,source.privacy,source.currency,
    selected,p.validRows,p.walletCount,p.total,p.staked,p.daily,p.apr,p.aprMissing,p.stale,
    price,fx,marketFresh,fxConfirmed,prefs.budget,prefs.buffer
  ]);
  if(lastRenderFingerprint===fingerprint)return;
  lastRenderFingerprint=fingerprint;
  const live=positive(price)&&positive(fx)&&p.ready&&marketFresh&&fxConfirmed&&!p.stale;
  const c=source.currency==='EUR'?'EUR':'USD';
  txt('freedomPrice',positive(price)?money(price*(c==='EUR'?fx:1),c):'—');
  txt('freedomUpdated',p.stale||(!marketFresh&&positive(price))||(!fxConfirmed&&positive(fx))?t('estimate'):live?t('synced'):t('priceWaiting'));
  $('freedomFeed').classList.toggle('is-offline',!live||!p.complete);
  const updated=(live&&p.complete)?'LIVE':(p.ready?(language()==='en'?'ESTIMATE':'STIMA'):'—');
  $('freedomFeed').lastChild.textContent=source.privacy?t('privacy'):updated;
  if(!p.ready||!positive(price)||!positive(fx)){
   resetOutput('notReady');return;
  }
  const worthEUR=p.total*price*fx,dayEUR=p.daily*price*fx,
   adjustedEUR=dayEUR*(1-prefs.buffer/100),
   monthGrossEUR=dayEUR*365/12,
   monthAdjustedEUR=adjustedEUR*365/12,
   coverage=monthAdjustedEUR/prefs.budget*100,
   budgetPerDay=prefs.budget*12/365;
  const convert=v=>c==='EUR'?v:v/fx;
  txt('freedomWorth',money(convert(worthEUR),c));
  txt('freedomInj',inj(p.total)+' INJ · '+inj(p.staked)+' STAKED');
  txt('freedomDay',money(convert(dayEUR),c));
  txt('freedomDayInj',inj(p.daily)+' INJ / '+(language()==='en'?'DAY':'GIORNO'));
  txt('freedomMonth',money(convert(monthGrossEUR),c));
  txt('freedomRewardInfo','APR NET: '+(p.staked>0?fmt(p.apr,2)+'%':'0%'));
  if(p.validRows===p.walletCount)renderTiers(worthEUR);
  else{
    $('freedomTierTrack').replaceChildren();
    txt('freedomTier','—');
    txt('freedomTierFoot',t('incompleteInfo'));
  }
  if(p.aprMissing||p.validRows!==p.walletCount){
    // Missing APR must not look like an actual 0 EUR/USD staking yield.
    txt('freedomDay','—');
    txt('freedomDayInj','—');
    txt('freedomMonth','—');
    txt('freedomRewardInfo',t('notReadyInfo'));
  }
  // A cached quote can still be used for a clearly labelled simulation.
  // Do not erase financial figures merely because WebSocket/FX is reconnecting.
  const usable=p.validRows===p.walletCount&&!p.aprMissing&&positive(price)&&positive(fx);
  const verified=usable&&marketFresh&&fxConfirmed&&!p.stale;
  const safeCoverage=usable?coverage:0;
  const ratioDisplay=Math.min(9999,Math.max(0,Math.round(coverage)));
  txt('freedomCoverage',usable?fmt(ratioDisplay,0)+'%':'—');
  $('freedomMeter').style.setProperty('--freedom-progress',String(Math.min(100,safeCoverage))+'%');
  $('freedomBarFill').style.width=Math.min(100,safeCoverage).toFixed(2)+'%';
  // A delayed tick must not obscure a valid, computable financial outcome.
  // Keep the actual financial status; explicitly label provisional values
  // below it rather than using an alarming generic error headline.
  txt('freedomStatusTitle',!usable?t('incomplete'):coverage>=100?t('yes'):t('no'));
  txt('freedomStatusExplain',!usable?t('incompleteInfo'):!verified?t('estimateInfo'):coverage>=100?t('yesInfo'):t('noInfo'));
  txt('freedomCoverageFoot',usable?money(convert(monthAdjustedEUR),c):'—');
  txt('freedomGoal',money(convert(prefs.budget),c));
  lifestyleRows(adjustedEUR,usable);
  const annualEURPerInj=(p.apr/100)*price*fx*(1-prefs.buffer/100);
  const target=usable&&annualEURPerInj>0?(prefs.budget/annualEURPerInj)*12:NaN;
  txt('freedomTargetInj',valid(target)?inj(target)+' INJ':(usable&&positive(annualEURPerInj)?'∞ INJ':'—'));
  txt('freedomMissingInj',valid(target)?inj(Math.max(0,target-p.staked))+' INJ':(usable&&positive(annualEURPerInj)?'∞ INJ':'—'));
  txt('freedomStressCoverage',usable?fmt(Math.round(coverage*.5*.7),0)+'%':'—');
 }
 function close(){
  if(window.parent!==window){
   try{window.parent.postMessage({type:'injnode:freedom-close'},location.origin)}catch(_){}
  }else location.href='./index.html';
 }
 function init(){
  readPrefs();
  readSpending();
  bindSpending();
  $('freedomClose').addEventListener('click',close);
  $('freedomWallet').addEventListener('change',e=>{selected=e.target.value;hasUserSelected=true;render()});
  function updateInputs(){
   const raw=$('freedomBudget').value;
   const value=raw.trim()?Number(raw):NaN;
   if(Number.isFinite(value)&&value>0){
    const amountEUR=Math.max(1,value)*(shownCurrency==='USD'?rateEURperUSD:1);
    prefs.budget=Number.isFinite(amountEUR)&&amountEUR>0?amountEUR:prefs.budget;
   }
   prefs.buffer=clamp(num($('freedomBuffer').value),0,90,prefs.buffer);
   writePrefs();render();
  }
  for(const id of ['freedomBudget','freedomBuffer']){
   $(id).addEventListener('input',updateInputs);
   $(id).addEventListener('change',()=>{
    updateInputs();
    if(id==='freedomBudget'){
     const formatted=String(Math.round(budgetAmountInCurrency()*100)/100);
     $(id).value=formatted;lastFormattedBudget=formatted;
    }else $(id).value=String(prefs.buffer);
   });
  }
  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='injnode:freedom-refresh'){hasUserSelected=false;render()}});
  window.addEventListener('pageshow',render);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
  render();
  timer=window.setInterval(()=>{if(!document.hidden)render()},5000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
