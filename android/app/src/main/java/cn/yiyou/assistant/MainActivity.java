package cn.yiyou.assistant;

import android.app.*;
import android.content.*;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.webkit.*;
import android.widget.Toast;
import android.view.View;
import java.io.*;
import java.nio.file.Files;
import java.util.Arrays;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String ORIGIN="https://appassets.androidplatform.net";
    private WebView web; private boolean ready=false; private ValueCallback<Uri[]> chooser;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web=new WebView(this);setContentView(web);
        // Keep content outside status/navigation bars, including Android 15 edge-to-edge.
        web.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(android.view.WindowInsets.Type.systemBars());v.setPadding(i.left,i.top,i.right,i.bottom);}else{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());}return insets;});
        web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(true);
        web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new Bridge(),"NativeBridge");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri u=request.getUrl();if(!"appassets.androidplatform.net".equals(u.getHost()))return null;
                String file=u.getPath();if(file==null||file.equals("/"))file="/index.html";
                file=file.substring(1);
                if(!Arrays.asList("index.html","app.js","engine.js","style.css","catalog.json").contains(file))return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));
                String type=file.endsWith(".js")?"text/javascript":file.endsWith(".json")?"application/json":file.endsWith(".css")?"text/css":"text/html";
                try{return new WebResourceResponse(type,"UTF-8",getAssets().open(file));}catch(IOException e){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
                if("appassets.androidplatform.net".equals(r.getUrl().getHost()))return false;
                if("https".equals(r.getUrl().getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,r.getUrl()));}catch(ActivityNotFoundException ignored){}}
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;
                Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(i,102);return true;
            }
        });
        web.loadUrl(ORIGIN+"/index.html");
    }
    class Bridge {
        @JavascriptInterface public void startCapture(){runOnUiThread(()->requestCapture());}
        @JavascriptInterface public void pageReady(){runOnUiThread(()->{ready=true;deliverCapture();});}
    }
    private void requestCapture(){
        if(!Settings.canDrawOverlays(this)){
            new AlertDialog.Builder(this).setTitle("开启悬浮采集按钮").setMessage("请允许显示在其他应用上层。按钮只截取当前画面，不会操作游戏。返回后会请求系统屏幕采集授权。")
                .setPositiveButton("去设置",(d,w)->startActivityForResult(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName())),100)).setNegativeButton("取消",null).show();return;
        }
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},103);
        // Stop this app's previous capture session before requesting a fresh projection token.
        stopService(new Intent(this,CaptureService.class));
        MediaProjectionManager manager=(MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE);
        Intent consent=Build.VERSION.SDK_INT>=34?manager.createScreenCaptureIntent(android.media.projection.MediaProjectionConfig.createConfigForDefaultDisplay()):manager.createScreenCaptureIntent();
        startActivityForResult(consent,101);
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==100){if(Settings.canDrawOverlays(this))requestCapture();return;}
        if(request==101){if(result==RESULT_OK&&data!=null)startForegroundService(new Intent(this,CaptureService.class).putExtra("code",result).putExtra("data",data));else Toast.makeText(this,"未开启屏幕采集，仍可手动导入截图",Toast.LENGTH_LONG).show();return;}
        if(request==102&&chooser!=null){chooser.onReceiveValue(result==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);chooser=null;}
    }
    @Override protected void onResume(){super.onResume();deliverCapture();}
    private void deliverCapture(){
        if(!ready||web==null)return;
        File image=new File(getFilesDir(),"pending.jpg"),time=new File(getFilesDir(),"pending-time.txt");if(!image.exists()||!time.exists())return;
        try{
            String data="data:image/jpeg;base64,"+android.util.Base64.encodeToString(Files.readAllBytes(image.toPath()),android.util.Base64.NO_WRAP);
            String when=new String(Files.readAllBytes(time.toPath()),java.nio.charset.StandardCharsets.UTF_8);
            web.evaluateJavascript("window.acceptNativeCapture("+JSONObject.quote(data)+","+JSONObject.quote(when)+");",v->{image.delete();time.delete();});
        }catch(IOException e){Toast.makeText(this,"截图读取失败，请重新采集",Toast.LENGTH_SHORT).show();}
    }
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("NativeBridge");web.destroy();}super.onDestroy();}
}
