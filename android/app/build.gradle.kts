import java.util.Properties

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

fun buildConfigString(value: String): String {
  return "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""
}

val configuredWebAppUrl = (findProperty("webAppUrl") as String?) ?: "https://fastcrochet.example.com"
val configuredDistributionMode = (findProperty("appDistributionMode") as String?) ?: "apk"
val configuredVersionCode = ((findProperty("appVersionCode") as String?) ?: "1").toInt()
val configuredVersionName = (findProperty("appVersionName") as String?) ?: "1.0.0"
val releaseKeystoreFile = rootProject.file("keystore/play-upload.local.properties")
val releaseKeystoreProps = Properties().apply {
  if (releaseKeystoreFile.exists()) {
    releaseKeystoreFile.inputStream().use { load(it) }
  }
}
val hasReleaseSigning =
  releaseKeystoreProps.getProperty("storeFile")?.isNotBlank() == true &&
    releaseKeystoreProps.getProperty("storePassword")?.isNotBlank() == true &&
    releaseKeystoreProps.getProperty("keyAlias")?.isNotBlank() == true &&
    releaseKeystoreProps.getProperty("keyPassword")?.isNotBlank() == true

fun resolveKeystorePath(relativePath: String): File {
  val normalized = relativePath.replace("\\", "/")
  return if (normalized.startsWith("/")) File(normalized) else rootProject.file(normalized)
}

android {
  namespace = "br.com.fastcrochet.app"
  compileSdk = 34

  signingConfigs {
    if (hasReleaseSigning) {
      create("release") {
        storeFile = resolveKeystorePath(releaseKeystoreProps.getProperty("storeFile"))
        storePassword = releaseKeystoreProps.getProperty("storePassword")
        keyAlias = releaseKeystoreProps.getProperty("keyAlias")
        keyPassword = releaseKeystoreProps.getProperty("keyPassword")
      }
    }
  }

  defaultConfig {
    applicationId = "br.com.fastcrochet.app"
    minSdk = 34
    targetSdk = 34
    versionCode = configuredVersionCode
    versionName = configuredVersionName

    buildConfigField("String", "WEB_APP_URL", buildConfigString(configuredWebAppUrl))
    buildConfigField("String", "APP_DISTRIBUTION_MODE", buildConfigString(configuredDistributionMode))
  }

  buildFeatures {
    buildConfig = true
  }

  buildTypes {
    debug {
      applicationIdSuffix = ".debug"
      versionNameSuffix = "-debug"
    }

    release {
      isMinifyEnabled = false
      if (hasReleaseSigning) {
        signingConfig = signingConfigs.getByName("release")
      }
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro"
      )
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }

  packaging {
    resources {
      excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("androidx.activity:activity-ktx:1.9.1")
  implementation("androidx.webkit:webkit:1.11.0")
}
