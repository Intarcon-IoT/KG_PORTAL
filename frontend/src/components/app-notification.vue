<template>
  <div class="notification-container">
    <transition-group
      name="notification"
      mode="out-in"
      tag="div"
      enter-active-class="notification-enter-active "
      leave-active-class="notification-leave-active"
      move-class="notification-move"
    >
      <div
        class="notification"
        v-for="(notification) in notifications"
        :key="notification.id"
        :class="notification.type"
        @mouseover="pauseNotification(notification.id)"
        @mouseleave="resumeNotification(notification.id)"
      >
        <div class="notification-content">
          <div class="icon-container icon">
            <v-icon
              v-if="notification.icon"
              :icon="notification.icon"
            />
          </div>
          <div class="text-content">
              <strong 
                v-if="notification.title"
              >
                {{ notification.title }}
              </strong>
              <p>{{ notification.message }}</p>
          </div>
          <div class="close-btn-container" @click="removeNotification(notification.id)">
            <v-icon
              class="close-btn"
              icon="fa-solid fa-xmark"
            />
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>
  
<script>
  export default {
    name: 'AppNotification',
    data() {
      return {
        notifications: [],
        timeoutIds: {},
      };
    },
    methods: {
      addNotification({ title = '', message = '', type = 'info', timeout =  3000}) {
        const icon = this.getIconForType(type);
        const notification = {
          id: (Math.random()*1000),
          title,
          message,
          type,
          icon,
          timeout
        };
        this.notifications.push(notification);
        this.startAutoRemove(notification.id, notification.timeout);
      },
      startAutoRemove(id, timeout) {
        const timeoutId = setTimeout(() => {
          this.removeNotification(id);
        }, timeout);

        this.timeoutIds[id] = timeoutId;
      },
      pauseNotification(id) {
        if (this.timeoutIds[id]) {
          clearTimeout(this.timeoutIds[id]);
          delete this.timeoutIds[id];
        }
      },
      resumeNotification(id) {
      this.startAutoRemove(id, 2000);
      },
      removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
      },
      getIconForType(type) {
      switch(type) {
        case 'success':
          return 'fa-solid fa-check';
        case 'error':
          return 'fa-solid fa-xmark';
        case 'warning':
          return 'fa-solid fa-triangle-exclamation';
        case 'info':
        default:
          return 'fa-solid fa-info';
      }
    },
    },
  };
</script>
  
<style scoped lang="css">
.notification-container {
  position: fixed;
  top: 85px;
  right: 20px;
  width: 300px;
  z-index: 9999;
  transition: width 0.3s ease;
}

.notification {
  border-radius: 5px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
  padding: 12px 15px;
  margin-bottom: 15px;
  transition: all 0.3s ease;
  width: 100%;
  background-color: var(--white-color);
}

.notification-enter-active {
  animation: slideIn 0.4s ease forwards;
}

.notification-leave-active {
  animation: slideOut 0.5s ease forwards;
  position: absolute;
}

.notification-move {
  transition: transform  0.5s ease;
}

.notification-content {
  display: flex;
  align-items: center;
}

.icon-container i {
  font-size: 20px;
  color: var(--white-color);
  border-radius: 50%;
  padding: 5px;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
}

.text-content {
  color: var(--black-color);
  width: 100%;
}

.text-content p {
  margin: 0;
}

.close-btn.v-icon {
  color: var(--black-color);
  font-size: 15px;
}

.icon-container {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  padding: 5px;
  border-radius: 100%;
  margin-right: 10px;
}

.close-btn-container {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  padding: 5px;
  border-radius: 4px;
  cursor: pointer;
  background-color: transparent;
  animation: 1.3 ease-in-out all;
  align-self: baseline;
  margin-left: 10px;
}

.close-btn-container:hover {
  background-color: var(--white-color);
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
}

.info .notification-content .icon {
  background-color: var(--notification-info-color);
}

.success .notification-content .icon {
  background-color: var(--notification-success-color);
}

.error .notification-content .icon {
  background-color: var(--notification-error-color);
}

.warning .notification-content .icon {
  background-color: var(--notification-warning-color);
}

@keyframes slideIn {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Pantallas medianas (Tabletas) */
@media (max-width: 768px) {
  .notification-container {
    width: 300px;
    right: 10px; 
  }
}

/* Pantallas pequeñas (Móviles) */
@media (max-width: 480px) {
  .notification-container {
    width: 75%;
    right: 5%;
  }
}
</style>