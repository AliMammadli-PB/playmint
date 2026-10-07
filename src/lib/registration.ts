export const usernameRe=/^[a-z0-9][a-z0-9_-]{1,22}[a-z0-9]$/;
export function registrationDetails(input:{username:string;role:string;password:string;confirm:string}) {
 if(!usernameRe.test(input.username))return "username";
 if(input.role!=="player"&&input.role!=="developer")return "role";
 if(input.password.length<8||input.password.length>128)return "password";
 if(input.password!==input.confirm)return "confirm";
 return null;
}
