// ==UserScript==
// @name         LINUX DO 占位符全自动恢复
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动读取楼主网站并替换占位符，同时将「G站」替换为 https://github.com
// @author       Antigravity
// @match        https://linux.do/t/topic/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const PLACEHOLDER = /遵守论坛准则/g;
    const GITHUB_PLACEHOLDER = /[Gg]站/g;
    const GITHUB_URL = 'https://github.com';

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

        const hasMainPlaceholder = opPost.textContent.includes('遵守论坛准则');
        const hasGithubPlaceholder = opPost.textContent.includes('G站') || opPost.textContent.includes('g站');

        if (!hasMainPlaceholder && !hasGithubPlaceholder) {
            console.log('LINUX DO 脚本：未发现任何占位符');
            return;
        }

        // 收集所有文本节点（先收集再操作，避免 TreeWalker 在 DOM 变更时出错）
        const walker = document.createTreeWalker(
            opPost,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }

        let replacedDomain = false;
        let replacedGithub = false;

        for (const textNode of textNodes) {
            // 替换「遵守论坛准则」→ 楼主域名
            if (domain && PLACEHOLDER.test(textNode.textContent)) {
                PLACEHOLDER.lastIndex = 0;
                textNode.textContent = textNode.textContent.replace(PLACEHOLDER, domain);
                replacedDomain = true;
            }

            // 替换「G站」→ https://github.com（纯文本）
            if (GITHUB_PLACEHOLDER.test(textNode.textContent)) {
                GITHUB_PLACEHOLDER.lastIndex = 0;
                textNode.textContent = textNode.textContent.replace(GITHUB_PLACEHOLDER, GITHUB_URL);
                replacedGithub = true;
            }
        }

        if (replacedDomain) {
            console.log(`LINUX DO 脚本：域名占位符已替换为 ${domain}`);
        }
        if (replacedGithub) {
            console.log(`LINUX DO 脚本：「G站」已替换为 ${GITHUB_URL}`);
        }
        if (!replacedDomain && !replacedGithub) {
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

        // 即使获取域名失败，也继续执行（G站替换不依赖域名）
        const domain = await getUserDomain(username);

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
