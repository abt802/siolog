function fn_jump_login(msg){
 msg = msg || 'エラーが発生しました\nログインし直してください';
 alert(msg);
 location.href = '/login';
}
