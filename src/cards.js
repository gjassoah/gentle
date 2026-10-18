import {cards,helpHtml} from './cards-data.js';

// These locations describe interface headings, including the terminology changes
// from the approved Shown metadata. They never request a computation.
export const cardLocations = [
  {ids:['W1'],view:'workspace',selector:'.setup-panel > .panel-heading'},
  {ids:['W2'],view:'workspace',selector:'.relations-heading'},
  {ids:['W3'],view:'workspace',selector:'label[for="convention"]'},
  {ids:['W4'],view:'workspace',selector:'label[for="characteristic"]'},
  {ids:['O1'],view:'overview',selector:'#center-heading'},
  {ids:['O2'],view:'overview',selector:'#global-dimension-heading'},
  {ids:['O3'],view:'overview',selector:'#circuits-heading'},
  {ids:['O3'],view:'structure',selector:'#complete-circuits-heading'},
  {ids:['G1','G2'],view:'cohomology',selector:'#group-heading',bar:true},
  {ids:['G1','G3'],view:'homology',selector:'#group-heading',bar:true},
  {ids:['G4'],view:'cyclic',selector:'#group-heading',bar:true},
  {ids:['G4'],view:'cyclic',heading:'Connes and noncommutative de Rham homology',bar:true},
  {ids:['P1'],view:'operations',selector:'#operation-heading',operation:'cup',bar:true},
  {ids:['P2'],view:'operations',selector:'#operation-heading',operation:'cap',bar:true},
  {ids:['P3'],view:'operations',selector:'#operation-heading',operation:'bracket',bar:true},
  {ids:['P4'],view:'operations',selector:'#operation-heading',operation:'lie',bar:true},
  {ids:['G4'],view:'operations',selector:'#operation-heading',operation:'connes',bar:true},
  {ids:['P5'],view:'lie',selector:'.result-card > h3'},
  {ids:['P6'],view:'higher',heading:'Query a higher degree with the small resolution'},
  {ids:['W2'],view:'structure',selector:'#path-basis-heading'},
  {ids:['S1'],view:'structure',selector:'#b-maximal-heading'},
  {ids:['S1'],view:'structure',selector:'#gamma-maximal-heading'},
  {ids:['S2'],view:'all',heading:'Homogeneous cohomology families'},
  {ids:['S3'],view:'all',heading:'Query any degree from the formulas'},
  {ids:['S4','S5'],view:'all',heading:'Full cohomology ring presentation'},
  {ids:['D1'],view:'surface',heading:'Ribbon vertices and cyclic orders'},
  {ids:['D1'],view:'surface',heading:'Ribbon edges'},
  {ids:['D2','D3'],view:'surface',heading:'Boundary and winding data'},
  {ids:['D4'],view:'surface',heading:'Avella-Alaminos–Geiss invariant'},
  {ids:['D5'],view:'surface',selector:'.surface-figure figcaption > h3'},
  {ids:['D6'],view:'derived',selector:'#derived-output .derived-components > .result-card > h3',derived:true},
  {ids:['D6','D9'],view:'derived',heading:'Inspect cycle windings and intersection form',derived:true},
  {ids:['D7'],view:'derived',selector:'#derived-heading'},
  {ids:['D7','D8'],view:'derived',heading:'Compare with another algebra tab'},
  {ids:['D9'],view:'derived',heading:'Checks and conventions',derived:true},
  {ids:['C1'],view:'overview',selector:'.calculus-checks > summary'},
];

const byId=new Map(cards.map(card=>[card.id,card]));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cardSummary(card){
  const source=card.sourceText;
  // The first cited locator, with every page of it; a source that starts with standard material says so.
  const citation=source.match(/(?:after )?(?:CSSS26|APS23|AG08)[\s\S]*?(?:pp?\.\s*\d+(?:[–−-]\d+)?(?:,\s*\d+(?:[–−-]\d+)?)*|;|$)/)?.[0].replace(/[.;]$/,'');
  if(citation)return `${card.kind[0].toUpperCase()+card.kind.slice(1)} · ${/^standard/i.test(source)?'standard and ':''}${citation}`;
  if(/^standard/i.test(source))return card.kind==='definition'?'Standard definition':`Standard ${card.kind}`;
  return `${card.kind[0].toUpperCase()+card.kind.slice(1)} · Methods`;
}
export function cardBody(card,convention){
  return `<div class="card-statement">${convention==='right'?card.rightHtml:card.leftHtml}</div><div class="card-application"><strong>In this application:</strong> ${card.applicationHtml}</div><div class="card-source"><strong>Source:</strong> ${card.sourceHtml}</div>`;
}
export function cardHTML(id,convention,{help=false}={}){
  const card=byId.get(id);
  if(!card)throw Error(`Unknown information card ${id}`);
  return `<details class="information-card" data-card="${id}" data-card-convention="${escape(convention)}"${help?' open':''}><summary>${escape(cardSummary(card))}</summary><div class="information-card-body"><h4>${card.titleHtml}</h4>${cardBody(card,convention)}</div></details>`;
}
export function unavailableReason(location,state){
  if(location.view==='workspace')return '';
  if(['surface','derived'].includes(location.view)){
    if(!state.valid)return 'This panel requires a valid finite-dimensional gentle presentation.';
    if(location.derived&&!state.derived)return 'Compute derived invariant to display this card at its heading.';
    return '';
  }
  if(!state.current)return 'Compute calculus to display this card at its heading.';
  if(location.bar&&state.formulaOnly)return 'This heading requires a completed bar calculation; the current report contains circuit dimensions.';
  return '';
}
export function preferredLocation(id,state){
  const locations=cardLocations.filter(location=>location.ids.includes(id));
  if(!locations.length)throw Error(`Unknown information card ${id}`);
  return locations.find(location=>!unavailableReason(location,state))||locations[0];
}

export function informationCards({state,navigate,closeHelp,document:doc=globalThis.document}){
  // Cache DOM nodes only for the active presentation. There is no storage key for
  // disclosures; changing Paths updates their bodies while retaining open nodes.
  const nodes=new Map();
  let owner=null,helpBody=null;
  const output=doc.querySelector('#result-output');
  const Observer=doc.defaultView?.MutationObserver??globalThis.MutationObserver;
  const observer=new Observer(()=>refresh());
  function updateCard(node,convention){
    if(node.dataset.cardConvention===convention)return;
    const card=byId.get(node.dataset.card);
    node.querySelector('.information-card-body').innerHTML=`<h4>${card.titleHtml}</h4>${cardBody(card,convention)}`;
    node.dataset.cardConvention=convention;
  }
  function refresh(){
    observer.disconnect();
    const current=state();
    if(owner!==current.algebraId){nodes.clear();owner=current.algebraId;doc.querySelectorAll('.information-card-group').forEach(node=>node.remove())}
    for(const [index,location] of cardLocations.entries()){
      if(location.view!=='workspace'&&location.view!==current.view)continue;
      if(location.operation&&location.operation!==current.operation)continue;
      if(unavailableReason(location,current))continue;
      const scope=location.view==='workspace'?doc:output;
      const headings=location.selector?[...scope.querySelectorAll(location.selector)]:[...scope.querySelectorAll('h3,h4,summary')].filter(h=>!h.closest('.information-card')&&h.textContent.trim()===location.heading);
      headings.forEach((heading,n)=>{
        // A definition list keeps each disclosure inside its definition body.
        const definition=heading.tagName==='DT'?heading.nextElementSibling:null;
        let group=definition?.querySelector(':scope > .information-card-group')||heading.nextElementSibling;
        if(!group?.classList.contains('information-card-group')){
          group=doc.createElement('div');group.className='information-card-group';
          if(definition)definition.prepend(group);else heading.after(group);
        }
        for(const id of location.ids){
          const key=`${index}-${n}-${id}`;
          let node=nodes.get(key);
          if(!node){const template=doc.createElement('template');template.innerHTML=cardHTML(id,current.convention);node=template.content.firstElementChild;node.id=`information-${key}`;nodes.set(key,node)}
          updateCard(node,current.convention);
          if(node.parentElement!==group)group.append(node);
        }
      });
    }
    if(helpBody){
      helpBody.querySelectorAll('.information-card').forEach(node=>updateCard(node,current.convention));
      helpBody.querySelectorAll('[data-show-card]').forEach(button=>{
        const reason=unavailableReason(preferredLocation(button.dataset.showCard,current),current);
        button.disabled=!!reason;button.textContent=reason||'Show where it is used';
      });
    }
    observer.observe(output,{childList:true,subtree:true});
  }
  function showWhere(id){
    const current=state(),location=preferredLocation(id,current);
    if(unavailableReason(location,current))return;
    closeHelp();navigate(location);refresh();
    const scope=location.view==='workspace'?doc.querySelector('.setup-panel'):output;
    const card=scope.querySelector(`[data-card="${id}"]`);
    if(card){for(let parent=card.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;card.open=true;card.scrollIntoView({block:'center',behavior:'auto'});card.querySelector('summary').focus({preventScroll:true})}
  }
  function help(body){
    helpBody=body;
    body.innerHTML=helpHtml;
    body.querySelectorAll('[data-help-card]').forEach(link=>link.setAttribute('aria-expanded','false'));
    // Each entry opens immediately beneath its index row, preserving the manual
    // and the index as approved. The linked card has its own heading and source.
    body.onclick=event=>{
      const link=event.target.closest('[data-help-card]');
      if(!link)return;
      event.preventDefault();
      const id=link.dataset.helpCard,card=byId.get(id);if(!card)return;
      body.querySelectorAll('.help-card-row').forEach(row=>row.remove());
      body.querySelectorAll('[data-help-card]').forEach(entry=>{entry.setAttribute('aria-expanded','false');entry.removeAttribute('aria-controls')});
      const row=doc.createElement('tr');row.className='help-card-row';row.id=`help-card-${id}`;
      link.setAttribute('aria-expanded','true');link.setAttribute('aria-controls',row.id);
      const cell=doc.createElement('td');cell.colSpan=3;row.append(cell);
      const current=state(),location=preferredLocation(id,current),reason=unavailableReason(location,current);
      cell.innerHTML=cardHTML(id,current.convention,{help:true})+`<button type="button" class="outline-button" data-show-card="${id}"${reason?' disabled':''}>${reason?escape(reason):'Show where it is used'}</button>`;
      link.closest('tr').after(row);
      cell.querySelector('[data-show-card]').onclick=()=>showWhere(id);
      row.scrollIntoView({block:'nearest'});cell.querySelector('summary').focus({preventScroll:true});
    };
  }
  refresh();
  return {refresh,help,showWhere};
}
