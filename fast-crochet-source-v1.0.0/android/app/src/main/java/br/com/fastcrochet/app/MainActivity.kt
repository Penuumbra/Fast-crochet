package br.com.fastcrochet.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
  private lateinit var webView: WebView
  private lateinit var progressBar: ProgressBar
  private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
  private var pendingPermissionRequest: PermissionRequest? = null

  private val cameraPermissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      val request = pendingPermissionRequest
      pendingPermissionRequest = null

      if (request == null) {
        return@registerForActivityResult
      }

      if (granted) {
        request.grant(request.resources)
      } else {
        request.deny()
      }
    }

  private val fileChooserLauncher =
    registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
      val callback = pendingFileCallback
      pendingFileCallback = null

      if (callback == null) {
        return@registerForActivityResult
      }

      val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
      callback.onReceiveValue(uris ?: emptyArray())
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_main)

    webView = findViewById(R.id.webView)
    progressBar = findViewById(R.id.progressBar)

    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        if (webView.canGoBack()) {
          webView.goBack()
          return
        }

        isEnabled = false
        onBackPressedDispatcher.onBackPressed()
      }
    })

    configureWebView()
    loadInitialScreen()
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun configureWebView() {
    CookieManager.getInstance().setAcceptCookie(true)
    CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

    webView.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      allowContentAccess = true
      allowFileAccess = false
      mediaPlaybackRequiresUserGesture = false
      databaseEnabled = true
      userAgentString = "$userAgentString FastCrochetAndroid/1.0"
    }

    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

    webView.webChromeClient = object : WebChromeClient() {
      override fun onProgressChanged(view: WebView?, newProgress: Int) {
        progressBar.progress = newProgress
        progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
      }

      override fun onPermissionRequest(request: PermissionRequest) {
        runOnUiThread {
          handlePermissionRequest(request)
        }
      }

      override fun onShowFileChooser(
        webView: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?
      ): Boolean {
        pendingFileCallback?.onReceiveValue(null)
        pendingFileCallback = filePathCallback

        val chooserIntent = try {
          fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
          }
        } catch (_: ActivityNotFoundException) {
          pendingFileCallback = null
          return false
        }

        return try {
          fileChooserLauncher.launch(chooserIntent)
          true
        } catch (_: ActivityNotFoundException) {
          pendingFileCallback?.onReceiveValue(null)
          pendingFileCallback = null
          false
        }
      }
    }

    webView.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(
        view: WebView?,
        request: WebResourceRequest?
      ): Boolean {
        val target = request?.url ?: return false

        if (shouldOpenExternally(target)) {
          openInBrowser(target)
          return true
        }

        return false
      }

      override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        CookieManager.getInstance().flush()
      }
    }
  }

  private fun loadInitialScreen() {
    val configuredUrl = BuildConfig.WEB_APP_URL.trim()
    if (configuredUrl.contains("fastcrochet.example.com")) {
      webView.loadUrl("file:///android_asset/setup-required.html")
      return
    }

    webView.loadUrl(configuredUrl)
  }

  private fun handlePermissionRequest(request: PermissionRequest) {
    val wantsCamera = request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)

    if (!wantsCamera) {
      request.grant(request.resources)
      return
    }

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
      PackageManager.PERMISSION_GRANTED
    ) {
      request.grant(request.resources)
      return
    }

    pendingPermissionRequest?.deny()
    pendingPermissionRequest = request
    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
  }

  private fun shouldOpenExternally(uri: Uri): Boolean {
    val scheme = uri.scheme?.lowercase() ?: return true
    if (scheme != "http" && scheme != "https") {
      return true
    }

    val appHost = Uri.parse(BuildConfig.WEB_APP_URL).host?.lowercase()
    val targetHost = uri.host?.lowercase()

    if (appHost.isNullOrBlank() || targetHost.isNullOrBlank()) {
      return false
    }

    return targetHost != appHost
  }

  private fun openInBrowser(uri: Uri) {
    runCatching {
      startActivity(Intent(Intent.ACTION_VIEW, uri))
    }
  }

  override fun onDestroy() {
    pendingFileCallback?.onReceiveValue(null)
    pendingFileCallback = null
    pendingPermissionRequest?.deny()
    pendingPermissionRequest = null
    webView.destroy()
    super.onDestroy()
  }
}
