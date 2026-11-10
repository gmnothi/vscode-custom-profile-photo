const {test}=require('node:test');
const assert=require('node:assert/strict');
const {decodePhoto,cssFor}=require('../core');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {createRequire}=require('node:module');

function crop(){const b=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.write('IHDR',12);b.writeUInt32BE(512,16);b.writeUInt32BE(512,20);return b;}
test('only bounded PNG crops accepted; CSS targets Accounts and leaves Manage alone',()=>{
 const png=crop();assert.deepEqual(decodePhoto('data:image/png;base64,'+png.toString('base64')),png);
 for(const data of ['data:image/svg+xml,<svg/>','data:image/png;base64,AAAA','https://example.com/photo.png'])assert.throws(()=>decodePhoto(data));
 const wrong=Buffer.from(png);wrong.writeUInt32BE(1,16);assert.throws(()=>decodePhoto('data:image/png;base64,'+wrong.toString('base64')));
 assert.throws(()=>decodePhoto('data:image/png;base64,'+'a'.repeat(3000001)));
 const css=cssFor(png);assert.match(css,/codicon-accounts-view-bar-icon/);assert.doesNotMatch(css,/settings-view-bar-icon|https?:/);
});

test('migration, crop save, reset, reapply and activation after restart preserve photo and unrelated imports',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'avatar-test-'));
 try{
  const uri=p=>({fsPath:p,toString:()=>require('node:url').pathToFileURL(p).href});
  const legacy=path.join(tmp,'vscode-avatar','avatar.css');await fs.mkdir(path.dirname(legacy));await fs.writeFile(legacy,cssFor(crop()));
  let imports=['file:///keep.css',uri(legacy).toString()],messages=[],receive,html;
  const state=new Map(),commands=new Map(),calls=[];
  const context={extensionUri:uri(path.resolve(__dirname,'..')),globalStorageUri:uri(path.join(tmp,'storage')),subscriptions:[],globalState:{get:k=>state.get(k),update:async(k,v)=>state.set(k,v)}};
  const v={version:'1.100.0',ConfigurationTarget:{Global:1},ViewColumn:{Active:1},Uri:{joinPath:(u,...p)=>uri(path.join(u.fsPath,...p)),parse:s=>uri(require('node:url').fileURLToPath(s))},workspace:{getConfiguration:()=>({get:()=>imports,update:async(k,v)=>{imports=v}}),fs:{readFile:u=>fs.readFile(u.fsPath),writeFile:(u,d)=>fs.writeFile(u.fsPath,d),createDirectory:u=>fs.mkdir(u.fsPath,{recursive:true})}},commands:{registerCommand:(k,f)=>{commands.set(k,f);return{dispose(){}}},executeCommand:async k=>{calls.push(k);if(commands.has(k))return commands.get(k)()}},window:{showInformationMessage:async()=>undefined,showErrorMessage:m=>{throw Error(m)},createWebviewPanel:()=>({webview:{set html(x){html=x},postMessage:async m=>messages.push(m),onDidReceiveMessage:f=>{receive=f}},onDidDispose(){},reveal(){}})}};
  const source=await fs.readFile(path.resolve(__dirname,'../extension.js'),'utf8'),module={exports:{}};
  const native=createRequire(path.resolve(__dirname,'../extension.js'));
  vm.runInNewContext(source,{require:n=>n==='vscode'?v:native(n),module,Buffer,console});
  await module.exports.activate(context);
  assert.equal(imports.length,2);assert.ok(imports.includes('file:///keep.css'));assert.ok(!imports.includes(uri(legacy).toString()));
  await commands.get('customProfilePhoto.open')();assert.match(html,/Content-Security-Policy/);assert.ok(!html.includes('NONCE'));
  await receive({type:'ready'});assert.equal(messages.at(-1).type,'photo');
  await receive({type:'save',data:'data:image/png;base64,'+crop().toString('base64')});assert.equal(messages.at(-1).type,'saved');assert.equal(calls.at(-1),'extension.updateCustomCSS');
  await commands.get('customProfilePhoto.reset')();assert.deepEqual(imports,['file:///keep.css']);assert.equal(state.get('enabled'),false);
  assert.deepEqual(await fs.readFile(path.join(tmp,'storage/avatar.png')),crop());
  await commands.get('customProfilePhoto.apply')();assert.equal(imports.length,2);assert.equal(state.get('enabled'),true);
  await module.exports.activate(context);assert.equal(imports.length,2);assert.deepEqual(await fs.readFile(path.join(tmp,'storage/avatar.png')),crop());
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
