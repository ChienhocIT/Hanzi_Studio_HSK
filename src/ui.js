export const h=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export const field=(label,name,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" required ${extra}></label>`;
export const button=(label,action,extra='')=>`<button type="button" class="btn" data-cloud="${action}" ${extra}>${label}</button>`;
