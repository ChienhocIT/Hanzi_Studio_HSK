/* Hanzi Studio v4.1 — manual, opt-in cross-device full backup; no network access. */
'use strict';
(function(){
  const keys = ['hanzi-studio-hsk3-prod-v1','hanzi-studio-curriculum-v4','hanzi-studio-video-lab-v1','hanzi-studio-situations-v4'];
  const d = id => document.getElementById(id);
  const status = s => { const el=d('hs-all-status'); if(el) el.textContent=s; };
  const tell = s => {status(s); if(typeof toast==='function')toast(s);};
  function downloadFile(filename, value){
    const url=URL.createObjectURL(new Blob([value],{type:'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  d('hs-all-export')?.addEventListener('click',()=>{
    try{
      const storage={};
      for(const key of keys){const value=localStorage.getItem(key);if(value!==null){JSON.parse(value);storage[key]=value;}}
      const content=JSON.stringify({format:'hanzi-studio-full-backup',version:1,appVersion:'4.1',exportedAt:new Date().toISOString(),storage},null,2);
      downloadFile('HanziStudio_day-du_'+new Date().toISOString().slice(0,10)+'.json',content);
      tell('Đã tạo bản sao lưu đủ '+Object.keys(storage).length+' nhóm dữ liệu. Giữ tệp ở nơi an toàn.');
    }catch(e){tell('Không xuất được: '+String(e.message||e));}
  });
  d('hs-all-import')?.addEventListener('click',()=>d('hs-all-file')?.click());
  d('hs-all-file')?.addEventListener('change',async e=>{
    try{
      const file=e.target.files?.[0];if(!file)return;
      if(file.size>12*1024*1024)throw Error('Giới hạn 12 MB');
      const input=JSON.parse(await file.text());
      if(input?.format!=='hanzi-studio-full-backup'||input.version!==1||!input.storage||typeof input.storage!=='object'||Array.isArray(input.storage))throw Error('Tệp không đúng định dạng sao lưu đầy đủ');
      const staging={};
      for(const [key,value] of Object.entries(input.storage)){
        if(!keys.includes(key)||typeof value!=='string'||value.length>7*1024*1024)throw Error('Dữ liệu sao lưu không hợp lệ');
        const object=JSON.parse(value);
        if(!object||typeof object!=='object'||Array.isArray(object))throw Error('Dữ liệu nhóm '+key+' sai định dạng');
        const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
        if(key===keys[0]&&(object.v!==1||!record(object.records)||!Array.isArray(object.bookmarks)||!Array.isArray(object.events)||!Array.isArray(object.quizHistory)||!record(object.settings)))throw Error('Tiến độ HSK 3 sai cấu trúc');
        if(key===keys[1]&&(!record(object.progress)||!Array.isArray(object.injected)||!Array.isArray(object.importLog)))throw Error('Lộ trình sai cấu trúc');
        if(key===keys[2]&&(!Array.isArray(object.lessons)||!record(object.stats)))throw Error('Dữ liệu video sai cấu trúc');
        staging[key]=value;
      }
      const confirmed=window.confirm('Khôi phục '+Object.keys(staging).length+' nhóm dữ liệu? Điều này sẽ thay thế dữ liệu học trên thiết bị hiện tại và tải lại trang. Nên xuất bản sao lưu hiện tại trước.');
      if(!confirmed){tell('Đã hủy khôi phục.');return;}
      const original={};for(const key of keys)original[key]=localStorage.getItem(key);
      try{
        for(const key of keys){if(staging[key]===undefined)localStorage.removeItem(key);else localStorage.setItem(key,staging[key]);}
      }catch(ex){
        for(const key of keys){try{if(original[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,original[key]);}catch(_){}}
        throw Error('Thiết bị thiếu dung lượng lưu; dữ liệu cũ đã được khôi phục nếu còn đủ chỗ.');
      }
      tell('Đã nhập dữ liệu. Đang tải lại để áp dụng…');
      location.reload();
    }catch(err){tell('Không thể khôi phục: '+String(err.message||err));}
    finally{e.target.value='';}
  });
})();
