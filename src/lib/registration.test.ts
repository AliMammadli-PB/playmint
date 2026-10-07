import {describe,it,expect} from "vitest";
import {registrationDetails} from "./registration";
const valid={username:"playmint_qa",role:"developer",password:"Good-password-123",confirm:"Good-password-123"};
describe("account registration",()=>{
 it("permits only player and developer signup",()=>{expect(registrationDetails(valid)).toBe(null);expect(registrationDetails({...valid,role:"player"})).toBe(null);for(const role of ["admin","","owner"])expect(registrationDetails({...valid,role})).toBe("role");});
 it("rejects mismatched confirmation and oversized passwords",()=>{expect(registrationDetails({...valid,confirm:"different"})).toBe("confirm");expect(registrationDetails({...valid,password:"x".repeat(129),confirm:"x".repeat(129)})).toBe("password");});
 it("rejects invalid usernames before creating accounts",()=>{for(const username of ["a","UPPER_CASE","a b","../admin","x".repeat(25),"_hello"])expect(registrationDetails({...valid,username})).toBe("username");});
});
