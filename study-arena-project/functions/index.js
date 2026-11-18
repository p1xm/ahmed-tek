import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore, FieldValue} from 'firebase-admin/firestore';
import OpenAI from 'openai';
import {randomInt} from 'node:crypto';

initializeApp();
const db=getFirestore();
const INVITE_CODE=defineSecret('INVITE_CODE');
const OPENAI_API_KEY=defineSecret('OPENAI_API_KEY');

export const registerWithInvite=onCall({secrets:[INVITE_CODE]},async(req)=>{
  const {name,phone,password,inviteCode}=req.data||{};
  if(!name||!phone||!password||password.length<6)throw new HttpsError('invalid-argument','بيانات التسجيل غير مكتملة');
  if(inviteCode!==INVITE_CODE.value())throw new HttpsError('permission-denied','رمز الدعوة غير صحيح');
  const normalized=String(phone).replace(/\D/g,'');
  const email=`${normalized}@study-arena.invalid`;
  const existing=await db.collection('phoneLookup').doc(normalized).get();
  if(existing.exists)throw new HttpsError('already-exists','رقم الهاتف مسجل بالفعل');
  const user=await getAuth().createUser({email,password,displayName:name});
  let uniqueId;
  for(let tries=0;tries<10;tries++){
    const candidate=`AY-${randomInt(100000,999999)}`;
    const used=await db.collection('uniqueIds').doc(candidate).get();
    if(!used.exists){uniqueId=candidate;break;}
  }
  if(!uniqueId){await getAuth().deleteUser(user.uid);throw new HttpsError('resource-exhausted','تعذر إنشاء ID فريد');}
  const profile={name,phone:normalized,uniqueId,bio:'',createdAt:FieldValue.serverTimestamp(),statistics:{matches:0,wins:0,losses:0}};
  await db.collection('users').doc(user.uid).set(profile);
  await db.collection('phoneLookup').doc(normalized).set({uid:user.uid});
  await db.collection('uniqueIds').doc(uniqueId).set({uid:user.uid});
  return {uid:user.uid,profile};
});

export const generateQuestions=onCall({secrets:[OPENAI_API_KEY]},async(req)=>{
  if(!req.auth)throw new HttpsError('unauthenticated','سجّل الدخول أولًا');
  const {fileName,content,count=10,level='medium'}=req.data||{};
  if(!content||content.length<80)throw new HttpsError('invalid-argument','النص المستخرج من الملف غير كافٍ. فعّل استخراج PDF/DOCX في الواجهة.');
  if(![5,10,15,20,30].includes(Number(count)))throw new HttpsError('invalid-argument','عدد الأسئلة غير مسموح');
  const client=new OpenAI({apiKey:OPENAI_API_KEY.value()});
  const response=await client.chat.completions.create({
    model:'gpt-4o-mini',temperature:0.2,
    response_format:{type:'json_object'},
    messages:[
      {role:'system',content:'أنت واضع أسئلة تعليمية. أنشئ أسئلة اختيار من متعدد اعتمادًا حصريًا على النص المرفق. لا تستخدم أي معلومة خارج النص. أعد JSON بالشكل {"questions":[{"text":"...","options":["...","...","...","..."],"answer":0}]}. answer فهرس من 0 إلى 3. لا تضف شروحًا أو إجابات ضمن نص السؤال.'},
      {role:'user',content:`اسم الملف: ${fileName}\nالمستوى: ${level}\nعدد الأسئلة: ${count}\nالنص:\n${content.slice(0,60000)}`}
    ]
  });
  let parsed;
  try{parsed=JSON.parse(response.choices[0].message.content)}catch{throw new HttpsError('internal','تعذر قراءة الأسئلة المولدة');}
  const questions=(parsed.questions||[]).slice(0,Number(count));
  if(questions.length!==Number(count)||questions.some(q=>!q.text||!Array.isArray(q.options)||q.options.length!==4||!Number.isInteger(q.answer)||q.answer<0||q.answer>3))
    throw new HttpsError('internal','صيغة الأسئلة المولدة غير صحيحة');
  // Never return answer keys to clients in a production multiplayer match.
  return {questions:questions.map(q=>({text:q.text,options:q.options,answer:q.answer}))};
});
