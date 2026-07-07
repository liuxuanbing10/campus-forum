import {Plugin,PluginContext,uid} from '@campus-forum/core';

export const messagesPlugin: Plugin = {
manifest:{name:'messages',version:'0.1.0',description:'私信系统',author:'campus-forum'},
apply(ctx:PluginContext){
const {app,db}=ctx;

app.post('/api/messages',async(req,rep)=>{
const userId=uid(req);if(!userId)return rep.status(401).send({error:'请先登录'});
const {receiverId,content}=req.body as {receiverId:number;content:string};
if(!receiverId||!content||!content.trim())return rep.status(400).send({error:'参数不完整'});
if(receiverId===userId)return rep.status(400).send({error:'不能给自己发消息'});
if(!db.get('SELECT id FROM users WHERE id=?',receiverId))return rep.status(404).send({error:'用户不存在'});
// 找或创建会话
const u1=Math.min(userId,receiverId),u2=Math.max(userId,receiverId);
let conv=db.get<{id:number}>('SELECT id FROM conversations WHERE user1_id=? AND user2_id=?',u1,u2);
if(!conv){db.run('INSERT INTO conversations (user1_id,user2_id) VALUES (?,?)',u1,u2);conv=db.get<{id:number}>('SELECT id FROM conversations ORDER BY id DESC LIMIT 1')!;}
db.run('INSERT INTO messages (conversation_id,sender_id,content) VALUES (?,?,?)',conv.id,userId,content.trim());
db.run("UPDATE conversations SET last_message=?,last_message_at=datetime('now') WHERE id=?",content.trim(),conv.id);
return {success:true,message:'发送成功'};
});

app.get('/api/conversations',async(req,rep)=>{
const userId=uid(req);if(!userId)return rep.status(401).send({error:'请先登录'});
return {conversations:db.all<any>(`SELECT c.id,c.last_message,c.last_message_at,
  CASE WHEN c.user1_id=? THEN u2.username ELSE u1.username END as other_username,
  CASE WHEN c.user1_id=? THEN u2.id ELSE u1.id END as other_id,
  (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id AND sender_id!=? AND is_read=0) as unread_count
  FROM conversations c JOIN users u1 ON c.user1_id=u1.id JOIN users u2 ON c.user2_id=u2.id
  WHERE c.user1_id=? OR c.user2_id=? ORDER BY c.last_message_at DESC`,userId,userId,userId,userId,userId)};
});

app.get('/api/conversations/:id/messages',async(req,rep)=>{
const userId=uid(req);if(!userId)return rep.status(401).send({error:'请先登录'});
const convId=Number((req.params as {id:string}).id);
const conv=db.get<{user1_id:number;user2_id:number}>('SELECT * FROM conversations WHERE id=?',convId);
if(!conv||(conv.user1_id!==userId&&conv.user2_id!==userId))return rep.status(403).send({error:'无权访问'});
// 标记已读
db.run('UPDATE messages SET is_read=1 WHERE conversation_id=? AND sender_id!=?',convId,userId);
return {messages:db.all<any>('SELECT m.*,u.username as sender_name FROM messages m JOIN users u ON m.sender_id=u.id WHERE m.conversation_id=? ORDER BY m.created_at ASC',convId)};
});

app.get('/api/messages/unread-count',async(req,rep)=>{
const userId=uid(req);if(!userId)return rep.status(401).send({error:'请先登录'});
const r=db.get<{c:number}>('SELECT COUNT(*) as c FROM messages m JOIN conversations c ON m.conversation_id=c.id WHERE (c.user1_id=? OR c.user2_id=?) AND m.sender_id!=? AND m.is_read=0',userId,userId,userId);
return {unreadCount:r?.c||0};
});
}};export default messagesPlugin;
