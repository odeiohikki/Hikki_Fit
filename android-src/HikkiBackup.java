package com.hikkistudio.fit.experimental;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;

@CapacitorPlugin(name="HikkiBackup")
public class HikkiBackup extends Plugin {
 @PluginMethod public void save(PluginCall call) {
  String name=call.getString("name");
  if(name==null || call.getString("uri")==null){call.reject("Arquivo inválido");return;}
  Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
  intent.addCategory(Intent.CATEGORY_OPENABLE);
  intent.setType("application/json");
  intent.putExtra(Intent.EXTRA_TITLE,name);
  startActivityForResult(call,intent,"saved");
 }
 @ActivityCallback private void saved(PluginCall call, ActivityResult result){
  if(call==null)return;
  if(result.getResultCode()!=Activity.RESULT_OK || result.getData()==null){call.reject("Salvamento cancelado");return;}
  Uri target=result.getData().getData();
  try {
   File source=new File(Uri.parse(call.getString("uri")).getPath()).getCanonicalFile();
   File cache=getContext().getCacheDir().getCanonicalFile();
   if(!source.getPath().startsWith(cache.getPath()+File.separator))throw new IOException("Origem inválida");
   try(InputStream in=new FileInputStream(source); OutputStream out=getContext().getContentResolver().openOutputStream(target,"wt")){
    if(out==null)throw new IOException("Destino indisponível");
    byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);
   }
   call.resolve();
  }catch(Exception e){call.reject("Não foi possível salvar",e);}
 }
}
