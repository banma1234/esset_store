<template>
  <!-- Vuetify 상단 앱바 -->
  <v-app-bar app dense color="white" class="elevation-1">
    <!-- 좌/우 컴포넌트를 space-between 으로 배치 -->
    <div class="d-flex align-center justify-space-between flex-grow-1">
      <!-- 좌측: 로고 (메인 이동) -->
      <div class="d-flex align-center">
        <v-btn text class="pa-0" height="auto" @click="goHome">
          <h1 class="text-h6 font-weight-bold mb-0">
            EssetStore
          </h1>
        </v-btn>
      </div>

      <!-- 우측: 검색바 + 에셋추가 + 관리자 기능 (하나의 그룹) -->
      <div class="d-flex align-center">
        <!-- 검색바 -->
        <v-text-field v-model="search" hide-details dense solo-inverted flat prepend-inner-icon="mdi-magnify"
          placeholder="검색" class="mr-2" @keyup.enter="onSearch" />

        <!-- 에셋 추가 버튼: /upload -->
        <v-btn color="primary" class="mr-2" @click="goUpload">
          에셋추가
        </v-btn>

        <!-- 관리자 기능 버튼: /settings -->
        <v-btn outlined color="primary" @click="goSettings">
          관리자 기능
        </v-btn>
      </div>
    </div>
  </v-app-bar>
</template>

<script>
export default {
  name: 'Header',

  data() {
    return {
      // 검색어 상태
      search: ''
    }
  },

  methods: {
    /**
     * @function goHome
     * @description 로고 클릭 시 메인 페이지(/)로 이동한다.
     */
    goHome() {
      this.$router.push('/')
    },

    /**
     * @function goUpload
     * @description 에셋추가 버튼 클릭 시 업로드 페이지(/upload)로 이동한다.
     */
    goUpload() {
      this.$router.push('/upload')
    },

    /**
     * @function goSettings
     * @description 관리자 기능 버튼 클릭 시 설정 페이지(/settings)로 이동한다.
     */
    goSettings() {
      this.$router.push('/settings')
    },

    /**
     * @function onSearch
     * @description 검색 엔터 입력 시 동작 (현재는 콘솔 출력만 수행)
     */
    onSearch() {
      // TODO: 실제 검색 로직 연결 예정
      // eslint-disable-next-line no-console
      console.log('[Header search]', this.search)
    }
  }
}
</script>
