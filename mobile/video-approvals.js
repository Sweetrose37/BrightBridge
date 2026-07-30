/*
 * LumiTalk Parent Video Approval data layer
 * Local-only storage with role capabilities and immutable audit entries.
 * Development demo records are seeded ONLY on localhost with
 * ?videoApprovalDemo=1 and are never seeded on production.
 */
(function () {
  "use strict";

  const STORAGE_KEY="brightbridge-video-approvals-v1";
  const parentActors=new WeakSet();
  const caregiverActors=new WeakSet();
  const caregiverActorVersions=new WeakMap();
  const statuses=["Draft","Pending Parent Approval","Approved","Rejected","Changes Requested","Expired","Removed by Parent"];
  const caregiverRoles=["Caregiver","Daycare or School Staff","Teacher","Therapist","Babysitter","Family Member"];

  function clean(value="",limit=240){return String(value||"").trim().slice(0,limit);}
  function now(){return new Date().toISOString();}
  function uid(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function initial(){
    return {
      version:1,
      settings:{caregiverCodeSalt:"",caregiverCodeHash:"",parentId:uid("parent"),parentDisplayName:"Parent or Guardian"},
      requests:[],
      audit:[],
      notifications:[]
    };
  }
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(saved&&Array.isArray(saved.requests)&&Array.isArray(saved.audit)){
        saved.settings={...initial().settings,...(saved.settings||{})};
        saved.notifications=Array.isArray(saved.notifications)?saved.notifications:[];
        return saved;
      }
    }catch{}
    return initial();
  }
  let state=load();

  function save(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}
    catch{return false;}
  }
  function audit(requestId,action,actor,detail=""){
    state.audit.push({auditId:uid("audit"),requestId,action,actorRole:actor?.role||"System",actorId:actor?.id||"system",detail:clean(detail),at:now()});
  }
  function notify(targetRole,message,requestId){
    state.notifications.push({notificationId:uid("notice"),targetRole,message,requestId,createdAt:now(),read:false});
  }
  function requireParent(actor){
    if(!actor||!parentActors.has(actor))throw new Error("Parent authorization required.");
  }
  function requireCaregiver(actor){
    if(!actor||!caregiverActors.has(actor)||caregiverActorVersions.get(actor)!==state.settings.caregiverCodeHash)throw new Error("Caregiver authorization required.");
  }
  async function digest(value){
    if(!crypto?.subtle)throw new Error("Secure caregiver access is unavailable.");
    const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes),item=>item.toString(16).padStart(2,"0")).join("");
  }
  function randomSalt(){
    const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
    return Array.from(bytes,item=>item.toString(16).padStart(2,"0")).join("");
  }

  function authorizeParent(enteredPin,storedPin){
    if(!/^\d{4}$/.test(String(enteredPin))||String(enteredPin)!==String(storedPin))return null;
    const actor={role:"Parent or Guardian",id:state.settings.parentId,displayName:state.settings.parentDisplayName};
    parentActors.add(actor);return actor;
  }
  function closeParent(actor){if(actor)parentActors.delete(actor);}
  async function setCaregiverCode(actor,code){
    requireParent(actor);
    if(!/^\d{4,8}$/.test(String(code)))throw new Error("Use 4 to 8 numbers.");
    const salt=randomSalt();state.settings.caregiverCodeSalt=salt;
    state.settings.caregiverCodeHash=await digest(`${salt}:${code}`);
    audit("", "Caregiver request code changed",actor);save();return true;
  }
  function hasCaregiverCode(){return Boolean(state.settings.caregiverCodeHash);}
  async function authorizeCaregiver(code,identity={}){
    const name=clean(identity.name,60),relationship=clean(identity.relationship,60),role=clean(identity.role,40);
    if(!hasCaregiverCode()||!name||!relationship||!caregiverRoles.includes(role))return null;
    const hash=await digest(`${state.settings.caregiverCodeSalt}:${code}`);
    if(hash!==state.settings.caregiverCodeHash)return null;
    const identityHash=await digest(`${name.toLowerCase()}|${relationship.toLowerCase()}|${role}`);
    const actor={role,id:`requester-${identityHash.slice(0,20)}`,displayName:name,relationship};
    caregiverActors.add(actor);caregiverActorVersions.set(actor,state.settings.caregiverCodeHash);return actor;
  }
  function closeCaregiver(actor){if(actor)caregiverActors.delete(actor);}
  function setParentIdentity(actor,displayName){
    requireParent(actor);state.settings.parentDisplayName=clean(displayName,60)||"Parent or Guardian";
    actor.displayName=state.settings.parentDisplayName;save();
  }
  function settings(actor){requireParent(actor);return clone(state.settings);}

  function normalizeInput(input={}){
    return {
      childIds:Array.isArray(input.childIds)?input.childIds.map(item=>clean(item,80)).filter(Boolean):[],
      videoUrl:clean(input.videoUrl,500),
      youtubeVideoId:clean(input.youtubeVideoId,20),
      title:clean(input.title,100),
      channelName:clean(input.channelName,100),
      thumbnailUrl:clean(input.thumbnailUrl,500),
      category:clean(input.category,60),
      reason:clean(input.reason,400),
      suggestedAgeRange:clean(input.suggestedAgeRange,60),
      sensoryNotes:clean(input.sensoryNotes,300),
      caregiverMessage:clean(input.caregiverMessage,400)
    };
  }
  function submit(actor,input){
    requireCaregiver(actor);
    const fields=normalizeInput(input);
    if(!fields.youtubeVideoId||!fields.title||!fields.channelName||!fields.category||!fields.reason||!fields.suggestedAgeRange||!fields.childIds.length)throw new Error("Complete every required request field.");
    const record={
      requestId:uid("request"),...fields,
      requesterId:actor.id,requesterName:actor.displayName,requesterRole:actor.role,requesterRelationship:actor.relationship,
      submittedAt:now(),status:"Pending Parent Approval",
      parentId:"",parentDisplayName:"",reviewedAt:"",approvedAt:"",rejectedAt:"",removedAt:"",
      parentNotes:"",rejectionReason:"",viewingLimitMinutes:0,allowRepeatPlayback:false,expiresAt:"",enabled:false,
      changeRequestMessage:"",demo:false,withdrawnAt:""
    };
    state.requests.push(record);audit(record.requestId,"Request submitted",actor);
    notify("Parent or Guardian","A caregiver has requested a video for your review.",record.requestId);save();
    return clone(record);
  }
  function ownRequests(actor){
    requireCaregiver(actor);
    expire();
    return clone(state.requests.filter(item=>item.requesterId===actor.id).map(({parentNotes,...safe})=>safe));
  }
  function edit(actor,requestId,input){
    requireCaregiver(actor);
    const request=state.requests.find(item=>item.requestId===requestId&&item.requesterId===actor.id);
    if(!request||!["Draft","Changes Requested"].includes(request.status))throw new Error("This request cannot be edited.");
    Object.assign(request,normalizeInput({...request,...input}),{status:"Draft"});
    audit(requestId,"Request edited",actor);save();return clone(request);
  }
  function resubmit(actor,requestId){
    requireCaregiver(actor);
    const request=state.requests.find(item=>item.requestId===requestId&&item.requesterId===actor.id);
    if(!request||!["Draft","Changes Requested"].includes(request.status))throw new Error("This request cannot be submitted.");
    request.status="Pending Parent Approval";request.submittedAt=now();request.withdrawnAt="";
    audit(requestId,"Request submitted",actor,"Resubmitted after edits");
    notify("Parent or Guardian","A caregiver has requested a video for your review.",requestId);save();return clone(request);
  }
  function withdraw(actor,requestId){
    requireCaregiver(actor);
    const request=state.requests.find(item=>item.requestId===requestId&&item.requesterId===actor.id);
    if(!request||request.status!=="Pending Parent Approval")throw new Error("Only a pending request can be withdrawn.");
    request.status="Draft";request.withdrawnAt=now();audit(requestId,"Request withdrawn",actor);save();return clone(request);
  }
  function expire(){
    const stamp=Date.now();
    state.requests.forEach(request=>{
      if(request.status==="Approved"&&request.expiresAt&&new Date(`${request.expiresAt}T23:59:59`).getTime()<stamp){
        request.status="Expired";request.enabled=false;audit(request.requestId,"Approval expired",null);
      }
    });
    save();
  }
  function parentRequests(actor,childIds=[]){
    requireParent(actor);expire();
    const allowed=new Set(childIds);
    return clone(state.requests.filter(item=>item.childIds.some(id=>allowed.has(id))));
  }
  function openRequest(actor,requestId){
    requireParent(actor);
    const request=state.requests.find(item=>item.requestId===requestId);
    if(!request)throw new Error("Request not found.");
    if(!request.reviewedAt)request.reviewedAt=now();
    audit(requestId,"Parent opened request",actor);save();return clone(request);
  }
  function approve(actor,requestId,approval){
    requireParent(actor);
    const request=state.requests.find(item=>item.requestId===requestId);
    if(!request||request.status!=="Pending Parent Approval")throw new Error("Only a pending request can be approved.");
    if(!approval?.confirmations||approval.confirmations.some(value=>value!==true)||approval.confirmations.length!==4)throw new Error("All approval confirmations are required.");
    if(!Array.isArray(approval.childIds)||!approval.childIds.length)throw new Error("Choose at least one child profile.");
    Object.assign(request,{
      status:"Approved",parentId:actor.id,parentDisplayName:actor.displayName,reviewedAt:request.reviewedAt||now(),approvedAt:now(),
      childIds:approval.childIds.map(item=>clean(item,80)),category:clean(approval.category,60)||request.category,
      sensoryNotes:clean(approval.sensoryNotes,300),viewingLimitMinutes:Math.max(0,Math.min(1440,Number(approval.viewingLimitMinutes)||0)),
      allowRepeatPlayback:Boolean(approval.allowRepeatPlayback),expiresAt:clean(approval.expiresAt,10),enabled:Boolean(approval.enabled),
      parentNotes:clean(approval.parentNotes,400),rejectedAt:"",removedAt:""
    });
    audit(requestId,"Parent approved",actor);notify("Caregiver","Your video request was approved.",requestId);save();return clone(request);
  }
  function reject(actor,requestId,rejectionReason,parentNotes=""){
    requireParent(actor);
    const request=state.requests.find(item=>item.requestId===requestId);
    if(!request||request.status!=="Pending Parent Approval")throw new Error("Only a pending request can be rejected.");
    Object.assign(request,{status:"Rejected",parentId:actor.id,parentDisplayName:actor.displayName,rejectedAt:now(),enabled:false,rejectionReason:clean(rejectionReason,120),parentNotes:clean(parentNotes,400)});
    audit(requestId,"Parent rejected",actor,rejectionReason);notify("Caregiver","Your video request was not approved.",requestId);save();return clone(request);
  }
  function requestChanges(actor,requestId,parentNotes){
    requireParent(actor);
    const request=state.requests.find(item=>item.requestId===requestId);
    if(!request||request.status!=="Pending Parent Approval")throw new Error("Only a pending request can be returned.");
    Object.assign(request,{status:"Changes Requested",parentId:actor.id,parentDisplayName:actor.displayName,changeRequestMessage:clean(parentNotes,400),enabled:false});
    audit(requestId,"Parent requested changes",actor);notify("Caregiver","The parent requested changes to your video request.",requestId);save();return clone(request);
  }
  function removeApproval(actor,requestId){
    requireParent(actor);
    const request=state.requests.find(item=>item.requestId===requestId);
    if(!request||request.status!=="Approved")throw new Error("Only an approved video can be removed.");
    request.status="Removed by Parent";request.removedAt=now();request.enabled=false;
    audit(requestId,"Parent removed approval",actor);save();return clone(request);
  }
  function auditForParent(actor,requestId){
    requireParent(actor);return clone(state.audit.filter(item=>item.requestId===requestId));
  }
  function notifications(actor){
    if(parentActors.has(actor))return clone(state.notifications.filter(item=>item.targetRole==="Parent or Guardian"));
    requireCaregiver(actor);
    const ownIds=new Set(state.requests.filter(item=>item.requesterId===actor.id).map(item=>item.requestId));
    return clone(state.notifications.filter(item=>item.targetRole==="Caregiver"&&ownIds.has(item.requestId)));
  }
  function requirePin(pin){
    if(String(pin)!==String(BB.store?.data?.settings?.parentPin||""))throw new Error("Parent authorization required.");
  }
  function exportAll(pin){requirePin(pin);return clone(state);}
  function importAll(pin,payload){
    requirePin(pin);
    if(!payload||!Array.isArray(payload.requests)||!Array.isArray(payload.audit))throw new Error("Invalid video approval backup.");
    const fresh=initial();
    state={
      ...fresh,...clone(payload),
      settings:{...fresh.settings,...clone(payload.settings||{})},
      requests:clone(payload.requests),
      audit:clone(payload.audit),
      notifications:Array.isArray(payload.notifications)?clone(payload.notifications):[]
    };
    save();
  }
  function clear(actor){requireParent(actor);state=initial();save();}

  const isLocal=["localhost","127.0.0.1"].includes(location.hostname);
  if(isLocal&&new URLSearchParams(location.search).get("videoApprovalDemo")==="1"&&!state.requests.length){
    state.requests.push({
      requestId:"demo-request-local-only",childIds:["child-1"],videoUrl:"https://youtu.be/M7lc1UVf-VE",youtubeVideoId:"M7lc1UVf-VE",
      title:"DEMO ONLY — Parent Review Practice",channelName:"YouTube API Demo",thumbnailUrl:"https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg",
      category:"learning-words",reason:"Development testing only",suggestedAgeRange:"Caregiver choice",sensoryNotes:"Demo record",
      caregiverMessage:"This record never seeds on production.",requesterId:"demo-caregiver",requesterName:"Demo Caregiver",
      requesterRole:"Caregiver",requesterRelationship:"Development tester",submittedAt:now(),status:"Pending Parent Approval",
      parentId:"",parentDisplayName:"",reviewedAt:"",approvedAt:"",rejectedAt:"",removedAt:"",parentNotes:"",
      rejectionReason:"",viewingLimitMinutes:0,allowRepeatPlayback:false,expiresAt:"",enabled:false,changeRequestMessage:"",demo:true,withdrawnAt:""
    });
    audit("demo-request-local-only","Request submitted",{role:"Caregiver",id:"demo-caregiver"},"Development-only demo");
    save();
  }

  window.BB=window.BB||{};
  BB.videoApprovals={
    statuses,caregiverRoles,authorizeParent,closeParent,setCaregiverCode,hasCaregiverCode,authorizeCaregiver,closeCaregiver,
    setParentIdentity,settings,submit,ownRequests,edit,resubmit,withdraw,parentRequests,openRequest,approve,reject,
    requestChanges,removeApproval,auditForParent,notifications,exportAll,importAll,clear
  };
})();
