#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

static NSString *Regions(UIView *v, UIViewReservedRegionKind *kind) {
    NSMutableArray *out = [NSMutableArray array];
    for (UIViewReservedRegion *r in [v reservedRegionsOfKind:kind options:UIViewReservedRegionQueryOptionsIncludeInactive]) {
        [out addObject:[NSString stringWithFormat:@"{active=%d frame=%@ margins=%@}", r.isActive,
                        NSStringFromCGRect(r.frame), NSStringFromUIEdgeInsets(r.margins)]];
    }
    return [NSString stringWithFormat:@"[%@]", [out componentsJoinedByString:@","]];
}

@interface ProbeVC : UIViewController <WKScriptMessageHandler>
@property (nonatomic) UIHinge *lastHinge;
@property (nonatomic) WKWebView *web;
@end

@implementation ProbeVC
- (void)log:(NSString *)event {
    UIView *v = self.view;
    UITraitCollection *t = self.traitCollection;
    NSLog(@"FOLDPROBE %@ bounds=%@ safe=%@ hSize=%ld vSize=%ld hinge=%ld angle=%.3f division=%@ occlusion=%@",
          event, NSStringFromCGRect(v.bounds), NSStringFromUIEdgeInsets(v.safeAreaInsets),
          (long)t.horizontalSizeClass, (long)t.verticalSizeClass,
          (long)self.lastHinge.status, self.lastHinge ? self.lastHinge.angle : -1.0,
          Regions(v, [UIViewReservedRegionKind divisionRegionKind]),
          Regions(v, [UIViewReservedRegionKind occlusionRegionKind]));
}

- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor = UIColor.systemBackgroundColor;
    __weak typeof(self) weakSelf = self;
    [self.view addInteraction:[[UIHingeInteraction alloc] initWithUpdateHandler:^(UIHingeInteraction *i, UIHingeInteractionUpdate *u) {
        weakSelf.lastHinge = u.hinge;
        [weakSelf log:@"hingeUpdate"];
    }]];
    [self registerForTraitChanges:@[UITraitHorizontalSizeClass.class, UITraitVerticalSizeClass.class]
                      withHandler:^(ProbeVC *vc, UITraitCollection *prev) { [vc log:@"traitChange"]; }];

    // WebKit side: does the page see devicePosture or segment env vars inside a plain WKWebView?
    WKWebViewConfiguration *cfg = [WKWebViewConfiguration new];
    [cfg.userContentController addScriptMessageHandler:self name:@"probe"];
    self.web = [[WKWebView alloc] initWithFrame:self.view.bounds configuration:cfg];
    self.web.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.web.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    [self.view addSubview:self.web];
    NSString *html = @"<meta name=viewport content='width=device-width,initial-scale=1,viewport-fit=cover'>"
    "<style>body{margin:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);font:14px -apple-system}"
    "#p{position:fixed;left:env(safe-area-inset-left);top:env(safe-area-inset-top);width:env(viewport-segment-width 0 0, -1px)}</style>"
    "<pre id=o></pre><div id=p></div><script>"
    "function r(e){var p=document.getElementById('p');var cs=getComputedStyle(document.body);"
    "var s={event:e,w:innerWidth,h:innerHeight,dpIn:'devicePosture' in navigator,dp:navigator.devicePosture&&navigator.devicePosture.type,"
    "segW:p.getBoundingClientRect().width,mqSegH:matchMedia('(horizontal-viewport-segments: 2)').matches,"
    "mqFolded:matchMedia('(device-posture: folded)').matches,safeL:cs.paddingLeft,safeT:cs.paddingTop,safeR:cs.paddingRight};"
    "document.getElementById('o').textContent=JSON.stringify(s,null,1);webkit.messageHandlers.probe.postMessage(JSON.stringify(s));}"
    "addEventListener('resize',function(){r('resize')});"
    "if(navigator.devicePosture)navigator.devicePosture.addEventListener('change',function(){r('postureChange')});r('load');</script>";
    [self.web loadHTMLString:html baseURL:[NSURL URLWithString:@"https://probe.localhost/"]];
}

- (void)userContentController:(WKUserContentController *)c didReceiveScriptMessage:(WKScriptMessage *)m {
    NSLog(@"FOLDPROBE web %@", m.body);
}
- (void)viewDidLayoutSubviews { [super viewDidLayoutSubviews]; [self log:@"viewDidLayoutSubviews"]; }
- (void)viewSafeAreaInsetsDidChange { [super viewSafeAreaInsetsDidChange]; [self log:@"safeAreaDidChange"]; }
- (void)viewWillTransitionToSize:(CGSize)size withTransitionCoordinator:(id<UIViewControllerTransitionCoordinator>)c {
    [super viewWillTransitionToSize:size withTransitionCoordinator:c];
    NSLog(@"FOLDPROBE viewWillTransitionToSize %@", NSStringFromCGSize(size));
    [c animateAlongsideTransition:nil completion:^(id ctx) { [self log:@"transitionDone"]; }];
}
@end

@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>
@property (nonatomic) UIWindow *window;
@end
@implementation SceneDelegate
- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)s options:(UISceneConnectionOptions *)o {
    self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
    self.window.rootViewController = [ProbeVC new];
    [self.window makeKeyAndVisible];
}
@end

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@end
@implementation AppDelegate
- (UISceneConfiguration *)application:(UIApplication *)a configurationForConnectingSceneSession:(UISceneSession *)s options:(UISceneConnectionOptions *)o {
    UISceneConfiguration *c = [[UISceneConfiguration alloc] initWithName:@"Default" sessionRole:s.role];
    c.delegateClass = SceneDelegate.class;
    return c;
}
@end

int main(int argc, char *argv[]) {
    @autoreleasepool { return UIApplicationMain(argc, argv, nil, NSStringFromClass(AppDelegate.class)); }
}
