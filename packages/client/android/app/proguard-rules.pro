# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Capacitor / WebView
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.BridgeActivity { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    <methods>;
}
-keep class * extends com.getcapacitor.Plugin { *; }

# Retrofit / OkHttp (if used)
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# Gson / JSON
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keepattributes EnclosingMethod

# JavaScript interface for WebView
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
   public *;
}

# Keep JavaScriptInterface annotations
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep line number information for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
