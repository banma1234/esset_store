<template>
  <v-container fluid class="py-6">
    <!-- 상단 헤더 -->
    <v-row>
      <v-col cols="12">
        <v-card class="pa-4 mb-4" outlined>
          <div class="d-flex justify-space-between align-center">
            <div>
              <h1 class="text-h5 font-weight-bold mb-1">
                관리자 대시보드
              </h1>
              <p class="mb-0 grey--text text--darken-1">
                EssetStore의 공통코드 및 에셋 로그를 관리합니다.
              </p>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- 관리 기능 카드들 -->
    <v-row dense>
      <!-- 카테고리 및 필터 관리 -->
      <v-col cols="12" md="4">
        <v-card class="h-100 d-flex flex-column" outlined>
          <v-card-title class="pb-1">
            <div class="d-flex align-center">
              <v-icon left color="primary">mdi-folder-cog</v-icon>
              <span class="text-subtitle-1 font-weight-medium">
                카테고리 및 필터 관리
              </span>
            </div>
          </v-card-title>
          <v-card-text class="flex-grow-1">
            공통코드를 통해 카테고리 트리와 필터 옵션을 관리합니다.
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" text nuxt to="/settings/commoncode">
              이동
              <v-icon right small>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- 에셋 스냅샷 조회 -->
      <v-col cols="12" md="4">
        <v-card class="h-100 d-flex flex-column" outlined>
          <v-card-title class="pb-1">
            <div class="d-flex align-center">
              <v-icon left color="indigo">mdi-camera-burst</v-icon>
              <span class="text-subtitle-1 font-weight-medium">
                에셋 스냅샷 조회
              </span>
            </div>
          </v-card-title>
          <v-card-text class="flex-grow-1">
            파일별 버전 히스토리와 스냅샷 정보를 트리 구조로 확인합니다.
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" text nuxt to="/settings/log/assetVersions">
              이동
              <v-icon right small>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- 에셋 이벤트 발생 조회 -->
      <v-col cols="12" md="4">
        <v-card class="h-100 d-flex flex-column" outlined>
          <v-card-title class="pb-1">
            <div class="d-flex align-center">
              <v-icon left color="deep-orange">mdi-history</v-icon>
              <span class="text-subtitle-1 font-weight-medium">
                에셋 이벤트 발생 조회
              </span>
            </div>
          </v-card-title>
          <v-card-text class="flex-grow-1">
            이벤트 로그를 필터링하고 CSV로 내려받을 수 있습니다.
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" text nuxt to="/settings/log/assetEvents">
              이동
              <v-icon right small>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>