import {Plugin,PluginContext,uid} from '@campus-forum/core';

export const exportPlugin: Plugin = {
manifest:{name:'export',version:'0.1.0',description:'数据导出',author:'campus-forum'},
apply(ctx:PluginContext){
const {app,db}=ctx;

app.get('/api/user/export',async(req,rep)=>{
const userId=uid(req);if(!userId)return rep.status(401).send({error:'请先登录'});
const posts=await db.all('SELECT id,title,content,board_id,created_at FROM posts WHERE author_id=? ORDER BY created_at DESC',userId);
const comments=await db.all('SELECT c.id,c.content,c.post_id,p.title as post_title,c.created_at FROM comments c JOIN posts p ON c.post_id=p.id WHERE c.author_id=? ORDER BY c.created_at DESC',userId);
const data=JSON.stringify({exportedAt:new Date().toISOString(),user:{id:userId},posts,comments},null,2);
rep.header('Content-Type','application/json;charset=utf-8');
rep.header('Content-Disposition','attachment; filename="campus-forum-export.json"');
return rep.send(data);
});
}};export default exportPlugin;
