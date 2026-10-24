export function adminReturnPath(value:unknown){
 return typeof value==='string'&&/^\/admin(?:\/|$)/.test(value)&&!/[\\\r\n]/.test(value)?value:'/admin';
}
