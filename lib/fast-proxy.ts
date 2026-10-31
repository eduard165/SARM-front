import 'server-only';
import {ApiError,backendResponse,checkOrigin,token} from './backend';
import {livestockQuery,livestockRoute,uuidPattern}from'./proxy-policy';
/** FastAPI y SQL autorizan cada operacion. Sin cache de permisos. */
export async function fastProxy(request:Request,path:string):Promise<Response|null>{
 const method=request.method,p=path.split('/').filter(Boolean),stock=livestockRoute(path,method),home=path==='/inicio/resumen'&&method==='GET',homeExport=path==='/inicio/exportar'&&method==='GET',biz=p[0]==='negocios'&&uuidPattern.test(p[1]||'');
 const report=biz&&p.length===3&&p[2]==='reportes'&&method==='GET';
 const events=biz&&((p.length===3&&p[2]==='eventos'&&method==='GET')||(p.length===5&&p[2]==='eventos'&&uuidPattern.test(p[3])&&p[4]==='anular'&&method==='POST')||(p.length===5&&p[2]==='animales'&&uuidPattern.test(p[3])&&p[4]==='eventos'&&method==='POST')||(p.length===6&&p[2]==='animales'&&uuidPattern.test(p[3])&&p[4]==='eventos'&&uuidPattern.test(p[5])&&method==='PATCH'));
 if(!stock&&!home&&!homeExport&&!report&&!events)return null;
 const access=await token();if(!access)throw new ApiError(401,'Inicia sesión para continuar.');
 const input=new URL(request.url).searchParams;let query=new URLSearchParams();
 if(stock){try{query=livestockQuery(input,stock.resource,stock.paginated,p.length===5)}catch(e){throw new ApiError(400,(e as Error).message)}}
 else{const allowed=home?['negocio_id']:homeExport?['formato']:report?['reporte','desde','hasta','animal_id','hato_id','ubicacion_id','formato']:method==='GET'?['animal_id','tipo','desde','hasta','pagina','tamano_pagina','incluir_anulados']:[];
  for(const[k,v]of input){if(!allowed.includes(k)||input.getAll(k).length!==1||v.length>150)throw new ApiError(400,'Filtro no permitido o repetido.');if(k.endsWith('_id')&&!uuidPattern.test(v))throw new ApiError(400,'Identificador inválido.');if(['desde','hasta'].includes(k)&&!/^\d{4}-\d{2}-\d{2}$/.test(v))throw new ApiError(400,'Fecha inválida.');query.set(k,v)}}
 let body:string|undefined;
 if(method!=='GET'){checkOrigin(request);const text=await request.text();if(new TextEncoder().encode(text).length>64000)throw new ApiError(413,'Registro demasiado grande.');const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw new ApiError(400,'Envía un objeto JSON.');body=JSON.stringify(data)}
 const start=performance.now(),response=await backendResponse(path+(query.size?'?'+query:''),{method,headers:{Authorization:`Bearer ${access}`},...(body?{body}:{})}),headers=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Server-Timing':`backend;dur=${(performance.now()-start).toFixed(1)}`});
 const ct=response.headers.get('content-type')||'application/json';if(!['application/json','application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].some(x=>ct.startsWith(x)))throw new ApiError(502,'Formato de respuesta inesperado.');headers.set('Content-Type',ct);const d=response.headers.get('content-disposition');if(d)headers.set('Content-Disposition',d);
 return new Response(await response.arrayBuffer(),{status:response.status,headers});
}
