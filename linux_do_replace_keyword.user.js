// ==UserScript==
// @name         LINUX DO 占位符全自动恢复
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动读取楼主网站并替换占位符
// @author       Antigravity
// @match        https://linux.do/t/topic/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const PLACEHOLDER = /遵守论坛准则/g;

    let isProcessed = false;

    // 获取楼主用户名
    function getOPUsername() {
        const usernameElement = document.querySelector(
            '#post_1 .names .username'
        );

        if (!usernameElement) {
            console.warn('LINUX DO 脚本：未找到楼主用户名');
            return null;
        }

        return usernameElement.textContent.trim();
    }

    // 获取用户网站域名
    async function getUserDomain(username) {
        try {
            console.log(`LINUX DO 脚本：正在获取用户 ${username} 信息`);

            const response = await fetch(`/u/${username}.json`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            const website = data.user?.website;

            if (!website) {
                console.warn('LINUX DO 脚本：用户未设置网站');
                return null;
            }

            const domain = new URL(website).hostname;

            console.log(`LINUX DO 脚本：获取到域名 ${domain}`);

            return domain;

        } catch (e) {
            console.error('LINUX DO 脚本：获取用户网站失败', e);
            return null;
        }
    }

    // 替换占位符
    function applyReplacement(domain) {
        const opPost = document.querySelector('#post_1 .cooked');

        if (!opPost) {
            console.warn('LINUX DO 脚本：未找到首楼内容');
            return;
        }

        // 没有占位符直接跳过
        if (!opPost.textContent.includes('遵守论坛准则')) {
            console.log('LINUX DO 脚本：未发现占位符');
            return;
        }

        const walker = document.createTreeWalker(
            opPost,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        let replaced = false;

        while ((node = walker.nextNode())) {
            if (PLACEHOLDER.test(node.textContent)) {
                node.textContent = node.textContent.replace(
                    PLACEHOLDER,
                    domain
                );

                replaced = true;
            }
        }

        if (replaced) {
            console.log(`LINUX DO 脚本：已替换为 ${domain}`);
        } else {
            console.log('LINUX DO 脚本：没有需要替换的内容');
        }
    }

    // 主流程
    async function startProcess() {
        if (isProcessed) {
            return;
        }

        const username = getOPUsername();

        if (!username) {
            return;
        }

        const domain = await getUserDomain(username);

        if (!domain) {
            return;
        }

        applyReplacement(domain);

        isProcessed = true;

        console.log('LINUX DO 脚本：处理完成');
    }

    // 等待首楼加载
    const checkExist = setInterval(() => {
        if (document.querySelector('#post_1 .cooked')) {
            clearInterval(checkExist);

            startProcess();
        }
    }, 500);

})();