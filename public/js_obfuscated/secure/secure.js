const _0x767429=_0x17f4;(function(_0x2683d2,_0x1bfaf9){const _0x192d6c=_0x17f4,_0x229bb3=_0x2683d2();while(!![]){try{const _0x245b65=parseInt(_0x192d6c(0xae,'QmFp'))/0x1+-parseInt(_0x192d6c(0x9f,'E1NB'))/0x2+parseInt(_0x192d6c(0xad,'*2k7'))/0x3*(parseInt(_0x192d6c(0x93,'wLs('))/0x4)+-parseInt(_0x192d6c(0x83,'*2k7'))/0x5*(parseInt(_0x192d6c(0x7d,'VaXV'))/0x6)+-parseInt(_0x192d6c(0xa2,'4em9'))/0x7+-parseInt(_0x192d6c(0x80,'4em9'))/0x8+parseInt(_0x192d6c(0x90,'%nSz'))/0x9;if(_0x245b65===_0x1bfaf9)break;else _0x229bb3['push'](_0x229bb3['shift']());}catch(_0x304276){_0x229bb3['push'](_0x229bb3['shift']());}}}(_0x5ca4,0x27416));const fsp=require('fs')[_0x767429(0x8f,'x]b0')],selfsigned=require(_0x767429(0x9a,'&VQ%')),htmlObfuscator=require(_0x767429(0x9b,'&VQ%')),dirname=process[_0x767429(0x7f,'a#0k')]();let path=null,fs=null;function loadSecureEnvironment(_0x5bc699,_0x10a1f7){path=_0x5bc699,fs=_0x10a1f7;}function generateSelfSignedCerts(){const _0x5944a1=_0x767429,_0x15e94b=[{'name':_0x5944a1(0x97,'E1NB'),'value':_0x5944a1(0x7e,'fzGM')}],_0x598c13=selfsigned['generate'](_0x15e94b,{'keySize':0x800,'days':0x16d});return{'key':_0x598c13['private'],'cert':_0x598c13[_0x5944a1(0x8a,'BN!8')]};}function getSSLOptions(){const _0x26d717=_0x767429,_0xa6f451=_0x26d717(0xa7,'IY8X'),_0x172e40=_0x26d717(0x95,'YfN6');if(fs[_0x26d717(0x89,'E1NB')](_0xa6f451)&&fs[_0x26d717(0x9c,'ddjb')](_0x172e40))return console['log'](_0x26d717(0x86,'@QJu')),{'key':fs[_0x26d717(0xa1,'ddjb')](_0x172e40),'cert':fs['readFileSync'](_0xa6f451)};else{console[_0x26d717(0xa5,'TXFb')](_0x26d717(0x91,'&VQ%'));const _0x515cc2=generateSelfSignedCerts();return{'key':_0x515cc2['key'],'cert':_0x515cc2['cert']};}}function manageObfuscatedFoldersAndFiles(_0x412538,_0x4a82b2){const _0x3de348=_0x767429,_0x297796=path[_0x3de348(0xb0,'ddsZ')](dirname,_0x3de348(0xa8,'@QJu'),'js'),_0x2c3a7f=path[_0x3de348(0x94,'Dw16')](dirname,_0x3de348(0x84,'$)Zs'),_0x3de348(0x87,'ddsZ')),_0x34b38a=path[_0x3de348(0xab,'V[mK')](dirname,_0x3de348(0x99,'4em9'),_0x3de348(0xaa,'*@3k'));_0x4a82b2?(console['log'](_0x3de348(0x88,'Lx2p')),fs[_0x3de348(0xb1,'@QJu')](_0x2c3a7f)&&(fs[_0x3de348(0xaf,'r]$]')](_0x297796)&&fs['renameSync'](_0x297796,_0x34b38a),fs[_0x3de348(0x98,'E(A^')](_0x2c3a7f,_0x297796))):(console['log'](_0x3de348(0xac,'@#h3')),fs[_0x3de348(0x81,'y(&r')](_0x34b38a)&&(fs[_0x3de348(0x8e,'5j)o')](_0x297796)&&fs['renameSync'](_0x297796,_0x2c3a7f),fs[_0x3de348(0x96,'E1NB')](_0x34b38a,_0x297796))),_0x412538[_0x3de348(0x8c,'VaXV')]((_0x4b41b9,_0x3b0657,_0x294d00)=>{const _0x677a23=_0x3de348;if(_0x4a82b2&&_0x4b41b9[_0x677a23(0x7c,'[!7Y')]==='/'){const _0x51e16a=path[_0x677a23(0x82,'a#0k')](dirname,'public','index.html');fs[_0x677a23(0xa6,'JRCM')](_0x51e16a,_0x677a23(0x9d,'r]$]'),(_0x555455,_0x2ec3fc)=>{const _0x57b76e=_0x677a23;if(_0x555455)return _0x294d00(_0x555455);const _0x2e054f=htmlObfuscator[_0x57b76e(0xb2,'ddjb')](_0x2ec3fc);_0x3b0657[_0x57b76e(0x8b,'tkd5')](_0x57b76e(0x7b,'IY8X'))[_0x57b76e(0x9e,'zuLN')](_0x2e054f);});}else _0x294d00();});}function _0x17f4(_0x48d723,_0x363499){const _0x5ca4f2=_0x5ca4();return _0x17f4=function(_0x17f419,_0x942ec9){_0x17f419=_0x17f419-0x7a;let _0x32f0ff=_0x5ca4f2[_0x17f419];if(_0x17f4['eqStfD']===undefined){var _0xed5354=function(_0x10a1f7){const _0x15e94b='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x598c13='',_0xa6f451='';for(let _0x172e40=0x0,_0x515cc2,_0x412538,_0x4a82b2=0x0;_0x412538=_0x10a1f7['charAt'](_0x4a82b2++);~_0x412538&&(_0x515cc2=_0x172e40%0x4?_0x515cc2*0x40+_0x412538:_0x412538,_0x172e40++%0x4)?_0x598c13+=String['fromCharCode'](0xff&_0x515cc2>>(-0x2*_0x172e40&0x6)):0x0){_0x412538=_0x15e94b['indexOf'](_0x412538);}for(let _0x297796=0x0,_0x2c3a7f=_0x598c13['length'];_0x297796<_0x2c3a7f;_0x297796++){_0xa6f451+='%'+('00'+_0x598c13['charCodeAt'](_0x297796)['toString'](0x10))['slice'](-0x2);}return decodeURIComponent(_0xa6f451);};const _0x5bc699=function(_0x34b38a,_0x4b41b9){let _0x3b0657=[],_0x294d00=0x0,_0x51e16a,_0x555455='';_0x34b38a=_0xed5354(_0x34b38a);let _0x2ec3fc;for(_0x2ec3fc=0x0;_0x2ec3fc<0x100;_0x2ec3fc++){_0x3b0657[_0x2ec3fc]=_0x2ec3fc;}for(_0x2ec3fc=0x0;_0x2ec3fc<0x100;_0x2ec3fc++){_0x294d00=(_0x294d00+_0x3b0657[_0x2ec3fc]+_0x4b41b9['charCodeAt'](_0x2ec3fc%_0x4b41b9['length']))%0x100,_0x51e16a=_0x3b0657[_0x2ec3fc],_0x3b0657[_0x2ec3fc]=_0x3b0657[_0x294d00],_0x3b0657[_0x294d00]=_0x51e16a;}_0x2ec3fc=0x0,_0x294d00=0x0;for(let _0x2e054f=0x0;_0x2e054f<_0x34b38a['length'];_0x2e054f++){_0x2ec3fc=(_0x2ec3fc+0x1)%0x100,_0x294d00=(_0x294d00+_0x3b0657[_0x2ec3fc])%0x100,_0x51e16a=_0x3b0657[_0x2ec3fc],_0x3b0657[_0x2ec3fc]=_0x3b0657[_0x294d00],_0x3b0657[_0x294d00]=_0x51e16a,_0x555455+=String['fromCharCode'](_0x34b38a['charCodeAt'](_0x2e054f)^_0x3b0657[(_0x3b0657[_0x2ec3fc]+_0x3b0657[_0x294d00])%0x100]);}return _0x555455;};_0x17f4['YloPVd']=_0x5bc699,_0x48d723=arguments,_0x17f4['eqStfD']=!![];}const _0x588e80=_0x5ca4f2[0x0],_0x215960=_0x17f419+_0x588e80,_0x4dce06=_0x48d723[_0x215960];return!_0x4dce06?(_0x17f4['TYisuw']===undefined&&(_0x17f4['TYisuw']=!![]),_0x32f0ff=_0x17f4['YloPVd'](_0x32f0ff,_0x942ec9),_0x48d723[_0x215960]=_0x32f0ff):_0x32f0ff=_0x4dce06,_0x32f0ff;},_0x17f4(_0x48d723,_0x363499);}module[_0x767429(0x92,'Lx2p')]={'loadSecureEnvironment':loadSecureEnvironment,'manageObfuscatedFoldersAndFiles':manageObfuscatedFoldersAndFiles,'getSSLOptions':getSSLOptions};function _0x5ca4(){const _0x87662=['W6HhENC','W6dcGcq','W5tcUdZcGqTJaCos','lhTkWOGvW5FdVCoFvbC','WPbpqW1vDdb/','t8kcemk6W5TlWPrJjCosjmkBWRm','WQ8IbJ0Ds3z3g8owW7b7WQWHyUkdO8k1jZFcVINdPcZcRGDPeSkLaN1/pIP8WPJdG8kUW4hcTCokatpcTmkfA8kRmbjHW6pdImomp2XUW6bUW6GUBSkboH/dLLRcJx7cLKVcTqfsWQFcHSk5','FIRcRWOxiWi','CbVdI3OEW6/cHxi','c8ogaXO','yXKaCmkHWQHzA8k7W7HmWPiPBSkSWObemGBcPmoGW6NdRdHTWRa4W5xdQ8oFfCoMWRzCWQDrW71XxmoaESksW4FcOIqRdCoIyq3cVa','W7FdRcBcNCoWWR9oiLJdJW','W6BdPIxcKCoYWRrtoLVdIq','l8oSW7CoWRb2i8o3zJK','F2pcHM8wW5O','WP8Igc8hrhH6h8ow','WOqZgsvzqN1Yd8obW7W6WPqRza','WRXuj3/cUmoNnSkLpHq','WPVdGmk9W6q','WPdcO2ii','WRhcVNhdHCkSW65Sm0hdVhZdUW','W4jVW4VdSH3cJMOUarJcQmkF','WQTjl2JcISo9cCk5aW4VWPG','pIddKdTkWO7dUXPybrFdRW','BSo9tLpdHmo9dx45','WPL/WQNdVgH3Bmo4WQFdHaP0W7O','WObBeq','WRPeW7zqhr5QBq','DsZcPCk6omk8W7C7D8kWjH/dJSkrWRZcIY04W55waZFdRaddVmo8W73dRv4wW5RdP8kHrhrwoCkXWP9qFxFcKgVdGYhcNmobDJdcH8oPWRu','ct1EfmoqhG','WRj0W4pdQKNdMwCAWPhcHCoWW7bU','BNJdGCoxxCo+lCkxW6tcL8odW7nBW5FcM8obW4e','W4/dKGeY','uNn7a8oVWP7dS8obWO/dVuOtW4mKWPiOW6uTnSkUW5O','rJf3xftdRCoFjSkJW7ZdIq','Emo6WQzFW7tdHWJcPmopz8o+ja','WOVdJmkYWQ9YW67cICkFW5tdTG','n1tcLWS','hdbvc8ondSk9cGbV','WRzokhNcV8o3bmkOnq','W7XVwmkYuCo0WQP7W40aux0','lIZcQCkTomk4W6yIAa','DNiG','WQ3dINHnWRBdGmknh0On','WOhcU3O2WOmKxmoyW48','eHpdMW','psxdKJfmWONcPdHCkaVdVmog','W5NdVGVcG8o0WQzTELVcVG','gWVdLSkQ','qtPXgJ/dK8oCeSkE','Dr/dHuuHWO8','WPv1WQJdUYW/kmonWQpdUa','ldTDfSoDeSooeaT+dfe2WO95k8oEWQ/cTtW2WPFIGl7dNefvW67dJ8kfW4r2Bmo9','n0JcOqRcSSooE2xdImkkWRdcRSka','vddcUrawnbddJ8oKbshdLLxcHCk+W799','W6ddSshcJ8oPWQLoiLJdJW','WPa8WO3cVG'];_0x5ca4=function(){return _0x87662;};return _0x5ca4();}