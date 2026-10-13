package cn.yiyou.assistant;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.graphics.*;
import android.hardware.display.*;
import android.media.*;
import android.media.projection.*;
import android.os.*;
import android.view.*;
import android.widget.*;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.time.Instant;

public class CaptureService extends Service {
    private static class DraggableStatus extends TextView {
        DraggableStatus(Context context){super(context);}
        @Override public boolean performClick(){super.performClick();return true;}
    }
    private MediaProjection projection;private VirtualDisplay display;private ImageReader reader;
    private WindowManager wm;private LinearLayout overlay;private DraggableStatus status;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private boolean wanted=false,stopping=false;private int width,height,density;
    @Override public IBinder onBind(Intent i){return null;}
    @Override public int onStartCommand(Intent intent,int flags,int id){
        if(intent==null||"stop".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        if(projection!=null)return START_NOT_STICKY;
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("capture","屏幕采集",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent stop=PendingIntent.getService(this,1,new Intent(this,CaptureService.class).setAction("stop"),PendingIntent.FLAG_IMMUTABLE);
        Notification n=new Notification.Builder(this,"capture").setSmallIcon(android.R.drawable.ic_menu_camera).setContentTitle("弈有章法：手动采集已开启").setContentText("点击悬浮按钮截取；点停止结束采集").setContentIntent(open).addAction(new Notification.Action.Builder(null,"停止",stop).build()).setOngoing(true).build();
        startForeground(1,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        try{
            Intent consent=intent.getParcelableExtra("data");
            MediaProjectionManager m=(MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE);
            projection=m.getMediaProjection(intent.getIntExtra("code",Activity.RESULT_CANCELED),consent);
            if(projection==null)throw new IllegalStateException();
            wm=(WindowManager)getSystemService(WINDOW_SERVICE);
            android.util.DisplayMetrics metrics=getResources().getDisplayMetrics();density=metrics.densityDpi;
            if(Build.VERSION.SDK_INT>=30){Rect b=wm.getMaximumWindowMetrics().getBounds();width=b.width();height=b.height();}else{width=metrics.widthPixels;height=metrics.heightPixels;}
            projection.registerCallback(new MediaProjection.Callback(){
                @Override public void onStop(){stopSelf();}
                @Override public void onCapturedContentResize(int w,int h){if(w!=width||h!=height)resize(w,h);}
            },handler);
            setupReader(width,height);
            display=projection.createVirtualDisplay("YiyouManualCapture",width,height,density,DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,reader.getSurface(),null,handler);
            showOverlay();
        }catch(Exception e){Toast.makeText(this,"无法开启采集，请检查授权后重试",Toast.LENGTH_LONG).show();stopSelf();}
        return START_NOT_STICKY;
    }
    private void setupReader(int w,int h){
        reader=ImageReader.newInstance(w,h,PixelFormat.RGBA_8888,2);
        reader.setOnImageAvailableListener(r->{
            Image image=null;boolean processing=false;
            try{
                image=r.acquireLatestImage();if(image==null||!wanted)return;wanted=false;processing=true;
                Image.Plane plane=image.getPlanes()[0];ByteBuffer b=plane.getBuffer();int row=plane.getRowStride(),pixel=plane.getPixelStride();
                Bitmap padded=Bitmap.createBitmap(row/pixel,image.getHeight(),Bitmap.Config.ARGB_8888);padded.copyPixelsFromBuffer(b);
                Bitmap cropped=Bitmap.createBitmap(padded,0,0,image.getWidth(),image.getHeight());
                float scale=Math.min(1f,1600f/Math.max(cropped.getWidth(),cropped.getHeight()));
                Bitmap result=Bitmap.createScaledBitmap(cropped,Math.max(1,(int)(cropped.getWidth()*scale)),Math.max(1,(int)(cropped.getHeight()*scale)),true);
                try(FileOutputStream out=openFileOutput("pending.jpg",MODE_PRIVATE)){result.compress(Bitmap.CompressFormat.JPEG,88,out);}
                Files.write(new File(getFilesDir(),"pending-time.txt").toPath(),Instant.now().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
                if(result!=cropped)result.recycle();if(cropped!=padded)cropped.recycle();padded.recycle();
                status.setText("已采集 · 尚未识别");
                Vibrator v=(Vibrator)getSystemService(VIBRATOR_SERVICE);v.vibrate(VibrationEffect.createOneShot(40,VibrationEffect.DEFAULT_AMPLITUDE));
            }catch(Exception e){wanted=false;if(status!=null)status.setText("采集失败，请重试");}
            finally{if(image!=null)image.close();if(processing&&overlay!=null)overlay.setVisibility(View.VISIBLE);}
        },handler);
    }
    private void resize(int w,int h){
        if(stopping||w<1||h<1||display==null)return;
        width=w;height=h;ImageReader old=reader;setupReader(w,h);display.resize(w,h,density);display.setSurface(reader.getSurface());if(old!=null)old.close();
    }
    private void showOverlay(){
        overlay=new LinearLayout(this);overlay.setOrientation(LinearLayout.VERTICAL);overlay.setPadding(12,8,12,8);overlay.setBackgroundColor(Color.argb(235,20,32,43));
        status=new DraggableStatus(this);status.setTextColor(Color.rgb(223,189,131));status.setTextSize(11);status.setText("手动采集 · 不操作游戏");overlay.addView(status);
        LinearLayout buttons=new LinearLayout(this);overlay.addView(buttons);
        Button capture=new Button(this);capture.setText("截取");capture.setTextSize(11);buttons.addView(capture);
        Button review=new Button(this);review.setText("回助手");review.setTextSize(11);buttons.addView(review);
        Button stop=new Button(this);stop.setText("停止");stop.setTextSize(11);buttons.addView(stop);
        WindowManager.LayoutParams params=new WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT);
        params.gravity=Gravity.TOP|Gravity.START;params.x=16;params.y=80;
        wm.addView(overlay,params);
        status.setOnTouchListener(new View.OnTouchListener(){float x,y;int ox,oy;
            public boolean onTouch(View v,android.view.MotionEvent e){if(e.getAction()==MotionEvent.ACTION_DOWN){x=e.getRawX();y=e.getRawY();ox=params.x;oy=params.y;return true;}if(e.getAction()==MotionEvent.ACTION_MOVE){params.x=ox+(int)(e.getRawX()-x);params.y=oy+(int)(e.getRawY()-y);wm.updateViewLayout(overlay,params);return true;}if(e.getAction()==MotionEvent.ACTION_UP&&Math.abs(e.getRawX()-x)<8&&Math.abs(e.getRawY()-y)<8)v.performClick();return true;}});
        capture.setOnClickListener(v->{
            if(wanted)return;status.setText("正在采集…");overlay.setVisibility(View.INVISIBLE);
            handler.postDelayed(()->{if(!stopping)wanted=true;},350);
            handler.postDelayed(()->{if(wanted){wanted=false;status.setText("未收到画面，请重试");overlay.setVisibility(View.VISIBLE);}},2500);
        });
        review.setOnClickListener(v->{Intent i=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);startActivity(i);});
        stop.setOnClickListener(v->stopSelf());
    }
    @Override public void onDestroy(){
        stopping=true;wanted=false;handler.removeCallbacksAndMessages(null);
        if(display!=null)display.release();if(reader!=null)reader.close();if(projection!=null)projection.stop();
        if(overlay!=null){try{wm.removeView(overlay);}catch(Exception ignored){}}
        stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
}
